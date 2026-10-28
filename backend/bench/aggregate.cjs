// Read-only HTTP benchmark. Only keys in this run's random namespace are removed.
require('dotenv').config({quiet:true});
const {spawn,execFileSync}=require('child_process');const Redis=require('ioredis');const fs=require('fs');const os=require('os');const {randomUUID}=require('crypto');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const mysqlCpu=()=>{const stat=execFileSync('docker',['compose','exec','-T','mysql','cat','/proc/1/stat'],{encoding:'utf8'}).trim().split(' ');return {userTicks:Number(stat[13]),systemTicks:Number(stat[14]),rssPages:Number(stat[23])};};
const redisCpu=async redis=>Object.fromEntries((await redis.info('cpu')).split('\r\n').filter(x=>/^used_cpu_user:|^used_cpu_sys:/.test(x)).map(x=>{const [k,v]=x.split(':');return[k,Number(v)]}));

(async()=>{
 const report={at:new Date().toISOString(),host:{platform:os.platform(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,totalMemory:os.totalmem(),node:process.version},requestCountPerCase:60,cases:[]};
 for(const mode of ['off','hot','mixed','cold','fault']){
 const namespace='bench:'+randomUUID(); const port=18082;
 const child=spawn(process.execPath,['dist/main.js'],{env:{...process.env,PORT:String(port),CACHE_ENABLED:mode==='off'?'false':'true',CACHE_NAMESPACE:namespace,REDIS_URL:mode==='fault'?'redis://127.0.0.1:1':process.env.REDIS_URL??'redis://127.0.0.1:6380'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;let token;
 try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await pause(100);}
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
 token=(await login.json()).access_token;if(!token)throw Error('Cannot authenticate benchmark');
 const headers={Authorization:'Bearer '+token};
 const get=async p=>{const r=await fetch(base+p,{headers});if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
 const list=await get('/registry?limit=1');report.entities=list.total;
 const countries=list.options.countries;
 const redis=new Redis(process.env.REDIS_URL??'redis://127.0.0.1:6380');
 const clear=async()=>{let cursor='0';do{const [next,keys]=await redis.scan(cursor,'MATCH',`commercial-da:${namespace}:*`,'COUNT',100);cursor=next;if(keys.length)await redis.unlink(...keys);}while(cursor!=='0');};
 try{
 for(const workload of ['repeat','varied'])for(const concurrency of [1,5,10]){
 await clear();const paths=Array.from({length:60},(_,i)=>'/registry/aggregate'+(workload==='repeat'?'?country=HK':`?country=${countries[i%countries.length]}&registrationStatus=${i%2?'ISSUED':'LAPSED'}`));
 if(mode==='hot')for(const path of new Set(paths))await get(path);
 const before=await get('/registry/cache-status');const dbBefore=mysqlCpu();const redisBefore=await redisCpu(redis);const samples=[];let errors=0;
 const started=performance.now();
 for(let i=0;i<60;i+=concurrency){if(mode==='cold')await clear();await Promise.all(paths.slice(i,i+concurrency).map(async p=>{const t=performance.now();try{await get(p);}catch{errors++;}samples.push(performance.now()-t);}));}
 const after=await get('/registry/cache-status');const dbAfter=mysqlCpu();const redisAfter=await redisCpu(redis);samples.sort((a,b)=>a-b);
 const metrics={};for(const k of ['hit','miss','error','fill','joined','sql','bypass','sqlMs','redisMs'])metrics[k]=after[k]-before[k];
 report.cases.push({mode,workload,concurrency,p50:samples[29],p95:samples[56],elapsedMs:performance.now()-started,errors,metrics,uniqueQueries:new Set(paths).size,mysqlCpuTicks:{user:dbAfter.userTicks-dbBefore.userTicks,system:dbAfter.systemTicks-dbBefore.systemTicks},mysqlRssPages:dbAfter.rssPages,redisCpuSeconds:{user:redisAfter.used_cpu_user-redisBefore.used_cpu_user,system:redisAfter.used_cpu_sys-redisBefore.used_cpu_sys},processMemory:after.processMemory,processCpuDelta:{user:after.processCpu.user-before.processCpu.user,system:after.processCpu.system-before.processCpu.system}});
 console.log(JSON.stringify(report.cases.at(-1)));
 }
 report.redisMemory= (await redis.info('memory')).split('\r\n').filter(x=>/^used_memory:|^used_memory_rss:|^maxmemory:/.test(x));
 }finally{await clear();redis.disconnect();}
 }finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
 }
 fs.writeFileSync(process.env.BENCH_REPORT ?? '../docs/aggregate-benchmark.json',JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
