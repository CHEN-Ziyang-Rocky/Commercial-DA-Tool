// Read-only SQL plans and preservation fingerprints; never outputs account/review values.
require('dotenv').config({quiet:true});
const fs=require('fs');const crypto=require('crypto');
const {AppDataSource:db}=require('../dist/config/typeorm.config');
const {AggregateService}=require('../dist/modules/registry/aggregate.service');
const {QueryCache}=require('../dist/modules/registry/query-cache');
(async()=>{await db.initialize();try{
 const cache=new QueryCache();const service=new AggregateService(db,cache);
 const snapshot=JSON.parse(fs.readFileSync('registry-data/gleif-snapshot.json','utf8'));
 const queries=[{country:['HK']},{root:snapshot.seeds[0].lei},{country:['HK'],city:['HONG KONG'],registrationStatus:['ISSUED']}];
 const plans=[];
 for(const q of queries){const {qb,level}=service.query(db.manager,q,new Date());const [sql,params]=qb.select(level,'level').addSelect('e.country','country').addSelect('e.registrationStatus','registrationStatus').addSelect('COUNT(*)','count').groupBy(level).addGroupBy('e.country').addGroupBy('e.registrationStatus').getQueryAndParameters();plans.push({query:q,sql,parameters:params,explain:await db.query('EXPLAIN '+sql,params)});}
 const preservation={};for(const table of ['users','registry_reviews']){const rows=await db.query('SELECT * FROM '+table);preservation[table]={count:rows.length,hash:crypto.createHash('sha256').update(JSON.stringify(rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest('hex')};}
 const counts=await db.query('SELECT COUNT(*) entities,SUM(directParentLei IS NOT NULL) linkedParents,COUNT(DISTINCT country) countries FROM registry_entities');
 const storage=await db.query("SELECT table_name AS name, data_length AS dataBytes, index_length AS indexBytes FROM information_schema.tables WHERE table_schema=DATABASE()");
 const report={at:new Date().toISOString(),counts,storage,preservation,plans};
 fs.writeFileSync('../docs/sql-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({counts,preservation}));
 }finally{await db.destroy();}})().catch(e=>{console.error(e.message);process.exitCode=1});
