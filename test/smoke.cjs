const fs = require('fs');
const assert = require('assert');
const PDFLib = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/pdf-lib');
const elements = new Map();
function element(){ return {value:'',textContent:'',hidden:false,className:'',firstElementChild:{textContent:''},children:[],addEventListener(){},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v},focus(){}}; }
const document = {getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement(){return element()}};
const source=fs.readFileSync('dist/app.js','utf8').replace(/\}\)\(\);\s*$/, 'globalThis.__functions={makeTex,validate,pdfProof};})();');
global.document=document;
global.window={PDFLib};
global.alert=()=>{};
eval(source);
const {makeTex,validate,pdfProof}=globalThis.__functions;
const article={title:'XML & PDF: A test',authors:['Balaji M.'],abstract:'This proof tests pagination and escaping.',sections:[{type:'heading',level:0,title:'Introduction'},{type:'paragraph',text:'A percent % and ampersand & need TeX escaping. '.repeat(20)},{type:'list',ordered:false,items:['First item','Second item']}],refs:['Example reference, 2026.'],unsupported:{}};
const tex=makeTex(article,'classic');
fs.writeFileSync('/tmp/manuscript-lab-smoke.tex',tex);
assert(tex.includes('XML \\& PDF'));
assert(tex.includes('percent \\% and ampersand \\&'));
assert(tex.includes('\\begin{document}'));
assert.strictEqual(validate(article,'strict').passed,true);
assert.strictEqual(validate({...article,title:''},'strict').passed,false);
assert.strictEqual(validate({...article,title:''},'advisory').passed,true);
assert(validate({...article,title:'தமிழ் article'},'advisory').warnings.some(w=>w.includes('Unicode-capable')));
(async()=>{
  const {bytes,pages}=await pdfProof(article,'classic');
  assert(bytes.length>1000 && pages>=1);
  fs.writeFileSync('/tmp/manuscript-lab-smoke.pdf',bytes);
  console.log(`OK: LaTeX escaping, validation modes, PDF generation (${pages} page, ${bytes.length} bytes)`);
})().catch(err=>{console.error(err);process.exitCode=1});
