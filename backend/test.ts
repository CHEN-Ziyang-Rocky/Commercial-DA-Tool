// test.ts
// npx tsc test.ts 编译成 JavaScript
// node test.js 用 Node 运行
const base = { a: 1, b: 2 };

const withC = { ...base, c: 3 };
const condition = true;
const extra = condition ? { c: 3 } : {};
const result = { ...base, ...extra };
const extra2 = false ? { c: 3 } : {};
const result2 = { ...base, ...extra2 };

console.log('base    =', base);
console.log('withC   =', withC);
console.log('result  =', result);
console.log('result2 =', result2);
