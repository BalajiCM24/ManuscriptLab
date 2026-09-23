(() => {
  'use strict';
  const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<article article-type="research-article" xmlns="http://jats.nlm.nih.gov">
  <front>
    <article-meta>
      <title-group>
        <article-title>Making publishing workflows observable</article-title>
      </title-group>
      <contrib-group>
        <contrib contrib-type="author"><name><given-names>Balaji</given-names><surname>M.</surname></name></contrib>
      </contrib-group>
      <abstract>
        <p>This sample demonstrates a traceable XML-to-PDF proof pipeline. Each stage records its output and validation notes.</p>
      </abstract>
    </article-meta>
  </front>
  <body>
    <sec>
      <title>Introduction</title>
      <p>Structured content provides a stable starting point for journal production. The prototype turns this manuscript into LaTeX and a downloadable PDF proof.</p>
    </sec>
    <sec>
      <title>Workflow</title>
      <p>The production sequence separates source analysis, template choice, typesetting, compilation, quality control, and delivery.</p>
      <list list-type="bullet">
        <list-item><p>Inspect the input and make the pipeline visible.</p></list-item>
        <list-item><p>Keep generated artifacts available for review.</p></list-item>
      </list>
    </sec>
  </body>
  <back><ref-list><title>References</title><ref id="r1"><mixed-citation>Example Publishing Group. Structured content handbook. 2026.</mixed-citation></ref></ref-list></back>
</article>`;
  const STAGE_META = [
    ['XML analysis','Parse structure, extract supported article content, and flag elements outside this prototype.'],
    ['Template selection','Apply journal appearance to the LaTeX source and PDF proof.'],
    ['LaTeX generation','Escape content and create a downloadable .tex source file.'],
    ['TeX compilation','Show the compile handoff. The hosted prototype cannot execute a TeX engine.'],
    ['Validation','Check essential content and record unsupported structures.'],
    ['PDF output','Render a real PDF proof locally in your browser and make it downloadable.']
  ];
  const $ = id => document.getElementById(id);
  const state = { stages: STAGE_META.map(([name,description]) => ({name,description,status:'pending',logs:[],artifacts:[]})), selected:0, files:{}, pdfUrl:null, busy:false, report:null };
  const input = $('xml-input'); input.value = SAMPLE;
  const updateCount = () => $('input-count').textContent = `${input.value.length.toLocaleString()} characters`;
  input.addEventListener('input', updateCount); updateCount();
  $('sample-btn').addEventListener('click', () => { input.value=SAMPLE; updateCount(); input.focus(); });
  $('upload-btn').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', async e => {
    const file=e.target.files[0]; if (!file) return;
    if(file.size>150000){ alert('The XML limit for this prototype is 150 KB.'); e.target.value=''; return; }
    input.value=await file.text(); updateCount(); e.target.value='';
  });
  $('run-btn').addEventListener('click', run);
  $('pdf-download').addEventListener('click',()=>download('manuscript-proof.pdf'));
  $('tex-download').addEventListener('click',()=>download('manuscript.tex'));
  $('report-download').addEventListener('click',()=>download('pipeline-report.json'));
  const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
  function stageUpdate(i,status,message,artifact){
    const s=state.stages[i]; s.status=status;
    if(message) s.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    if(artifact&&!s.artifacts.includes(artifact)) s.artifacts.push(artifact);
    state.selected=i; render();
  }
  function render(){
    const completed=state.stages.filter(s=>['success','simulated'].includes(s.status)).length;
    $('pipeline-count').textContent=`${completed} / 6 completed`;
    const holder=$('stages'); holder.replaceChildren();
    state.stages.forEach((s,i)=>{
      const b=document.createElement('button'); b.type='button';
      b.className=`stage ${s.status} ${state.selected===i?'selected':''}`;
      b.setAttribute('role','listitem'); b.setAttribute('aria-label',`${s.name}: ${s.status}`);
      const symbols={pending:'·',running:'↻',success:'✓',simulated:'~',error:'!'};
      const labels={pending:'PENDING',running:'RUNNING',success:'DONE',simulated:'SIMULATED',error:'ERROR'};
      for(const [cls,value] of [['stage-index',String(i+1).padStart(2,'0')],['stage-symbol',symbols[s.status]],['stage-name',s.name],['stage-state',labels[s.status]]]){const el=document.createElement('span');el.className=cls;el.textContent=value;b.append(el);}
      b.addEventListener('click',()=>{state.selected=i;render();}); holder.append(b);
    });
    const s=state.stages[state.selected]; $('detail-title').textContent=s.name;
    const pill=$('detail-status');pill.textContent=s.status[0].toUpperCase()+s.status.slice(1);pill.className=`status-pill ${s.status}`;
    $('detail-description').textContent=s.description;
    $('detail-log').textContent=s.logs.length?s.logs.join('\n'):'No events recorded for this stage.';
    $('log-count').textContent=`${s.logs.length} EVENTS`;
    const arts=$('stage-artifacts');arts.replaceChildren();
    if(!s.artifacts.length){const el=document.createElement('span');el.className='empty-artifacts';el.textContent='No artifacts for this stage.';arts.append(el);}
    else s.artifacts.forEach(name=>{const b=document.createElement('button');b.type='button';b.className='artifact-chip';b.textContent=`↓ ${name}`;b.addEventListener('click',()=>download(name));arts.append(b);});
  }
  render();
  const children=(node,name)=>Array.from(node?.children||[]).filter(x=>x.localName===name);
  const child=(node,name)=>children(node,name)[0]||null;
  const first=(node,name)=>Array.from(node?.getElementsByTagName('*')||[]).find(x=>x.localName===name)||null;
  const clean=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();
  const texEscape=str=>String(str).replace(/[\\{}$%&#_^~]/g,ch=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','\$':'\\$','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[ch]));
  function parseXML(source){
    if(!source.trim()) throw Error('No XML provided. Paste an article or load the sample.');
    if(source.length>150000) throw Error('XML exceeds the 150 KB prototype limit.');
    if(/<!DOCTYPE|<!ENTITY/i.test(source)) throw Error('DTD and entity declarations are not supported in browser processing.');
    const doc=new DOMParser().parseFromString(source,'application/xml');
    const error=doc.getElementsByTagName('parsererror')[0];
    if(error) throw Error(`Malformed XML: ${clean(error).slice(0,280)}`);
    const root=doc.documentElement;
    if(root.localName!=='article') throw Error(`Expected <article> as root; found <${root.localName}>.`);
    const meta=first(root,'article-meta')||root;
    const title=clean(first(meta,'article-title'))||clean(child(root,'title'));
    const authors=Array.from(meta.getElementsByTagName('*')).filter(x=>x.localName==='contrib' && (x.getAttribute('contrib-type')||'author')==='author').map(x=>{
      const name=first(x,'name');return name?[clean(first(name,'given-names')),clean(first(name,'surname'))].filter(Boolean).join(' '):clean(first(x,'string-name'));
    }).filter(Boolean);
    if(!authors.length) authors.push(...children(root,'author').map(clean).filter(Boolean));
    const abstract=clean(first(meta,'abstract'));
    const body=first(root,'body')||root;
    const sections=[];
    function processContainer(node,level=0){
      for(const el of Array.from(node.children)){
        if(el.localName==='sec'||el.localName==='section'){
          sections.push({type:'heading',level,title:clean(child(el,'title'))||'Untitled section'});
          processContainer(el,level+1);
        } else if(el.localName==='p'){
          const value=clean(el);if(value)sections.push({type:'paragraph',text:value});
        } else if(el.localName==='list'){
          const ordered=(el.getAttribute('list-type')||'').includes('order')&&!((el.getAttribute('list-type')||'').includes('bullet'));
          const items=children(el,'list-item').map(clean).filter(Boolean);if(items.length)sections.push({type:'list',ordered,items});
        }
      }
    }
    processContainer(body);
    const refList=first(root,'ref-list');
    const refs=children(refList,'ref').map(x=>clean(first(x,'mixed-citation'))||clean(first(x,'element-citation'))||clean(x)).filter(Boolean);
    const unsupported=['fig','fig-group','table-wrap','table','disp-formula','inline-formula','graphic','media','xref','supplementary-material'];
    const found={};for(const el of root.getElementsByTagName('*'))if(unsupported.includes(el.localName))found[el.localName]=(found[el.localName]||0)+1;
    return {title,authors,abstract,sections,refs,unsupported:found,root:root.localName};
  }
  function makeTex(article,template){
    const modern=template==='modern';
    const lines=[`% Manuscript Lab prototype · generated ${new Date().toISOString()}`,'% Review the source before compiling in a production TeX environment.',`\\documentclass[${modern?'11pt':'10pt'}]{article}`,'\\usepackage[T1]{fontenc}','\\usepackage[utf8]{inputenc}','\\usepackage{lmodern}','\\usepackage{geometry}',`\\geometry{margin=${modern?'1in':'0.85in'}}`,'\\usepackage{microtype}','\\usepackage{enumitem}','\\setlength{\\parindent}{0pt}','\\setlength{\\parskip}{6pt}',`\\title{${texEscape(article.title||'Untitled manuscript')}}`,`\\author{${texEscape(article.authors.join(', ')||'Author unknown')}}`,'\\date{}','\\begin{document}','\\maketitle'];
    if(article.abstract)lines.push('\\begin{abstract}',texEscape(article.abstract),'\\end{abstract}');
    for(const item of article.sections){
      if(item.type==='heading')lines.push(`\\${item.level?'subsection':'section'}{${texEscape(item.title)}}`);
      if(item.type==='paragraph')lines.push(texEscape(item.text),'');
      if(item.type==='list'){lines.push(`\\begin{${item.ordered?'enumerate':'itemize'}}`);for(const v of item.items)lines.push(`\\item ${texEscape(v)}`);lines.push(`\\end{${item.ordered?'enumerate':'itemize'}}`);}
    }
    if(article.refs.length){lines.push('\\section*{References}','\\begin{enumerate}[leftmargin=*]');for(const ref of article.refs)lines.push(`\\item ${texEscape(ref)}`);lines.push('\\end{enumerate}');}
    lines.push('\\end{document}');return lines.join('\n')+'\n';
  }
  function validate(article,mode){
    const errors=[],warnings=[];
    if(!article.title)errors.push('Article title is missing.');
    if(!article.sections.some(s=>s.type==='paragraph'||s.type==='list'))errors.push('Body has no supported paragraphs or list items.');
    if(!article.authors.length)warnings.push('No author found.');
    if(!article.abstract)warnings.push('Abstract is missing.');
    const proofText=[article.title,...article.authors,article.abstract,...article.sections.flatMap(s=>[s.title,s.text,...(s.items||[])]),...article.refs].filter(Boolean).join(' ');
    if(Array.from(proofText).some(ch=>ch.codePointAt(0)>255&&!"\u2018\u2019\u201c\u201d\u2013\u2014".includes(ch)))warnings.push('Some characters are outside the browser proof font and will appear as question marks. Use a Unicode-capable TeX workflow for production.');
    for(const [name,count] of Object.entries(article.unsupported))warnings.push(`${count} <${name}> element(s) omitted or flattened in this proof; inspect source before production.`);
    return {mode,errors,warnings,passed:mode==='strict'?errors.length===0:true};
  }
  async function pdfProof(article,template){
    const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
    const pdf=await PDFDocument.create();
    pdf.setTitle(article.title||'Untitled manuscript');pdf.setCreator('Manuscript Lab browser proof');
    const regular=await pdf.embedFont(template==='modern'?StandardFonts.Helvetica:StandardFonts.TimesRoman);
    const bold=await pdf.embedFont(template==='modern'?StandardFonts.HelveticaBold:StandardFonts.TimesRomanBold);
    const accent=template==='modern'?rgb(.11,.31,.25):rgb(.18,.26,.22),gray=rgb(.35,.42,.38);
    const width=595.28,height=841.89,left=65,right=65,bottom=66,max=width-left-right;
    let page,y,pages=0;
    const safe=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7e\u00a0-\u00ff]/g,'?');
    function newPage(){page=pdf.addPage([width,height]);pages++;y=height-66;page.drawText('MANUSCRIPT LAB  /  BROWSER PROOF',{x:left,y:height-35,size:8,font:bold,color:gray});page.drawLine({start:{x:left,y:height-44},end:{x:width-right,y:height-44},thickness:.6,color:rgb(.75,.81,.76)});page.drawText(`${pages}`,{x:width-right-5,y:29,size:9,font:regular,color:gray});}
    function ensure(amount){if(y-amount<bottom)newPage();}
    function wrapped(text,font,size,limit){const words=safe(text).split(/\s+/).filter(Boolean),lines=[];let line='';for(const word of words){const attempt=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(attempt,size)>limit&&line){lines.push(line);line=word;}else line=attempt;}if(line)lines.push(line);return lines.length?lines:[''];}
    function paragraph(text,{font=regular,size=10.5,line=16,indent=0,space=10,color=rgb(.16,.2,.17)}={}){for(const part of wrapped(text,font,size,max-indent)){ensure(line);page.drawText(part,{x:left+indent,y,size,font,color});y-=line;}y-=space;}
    newPage();y-=30;
    paragraph(article.title||'Untitled manuscript',{font:bold,size:22,line:28,space:16,color:accent});
    if(article.authors.length)paragraph(article.authors.join(', '),{size:11,space:20,color:gray});
    if(article.abstract){ensure(50);page.drawLine({start:{x:left,y:y+2},end:{x:width-right,y:y+2},thickness:1,color:accent});y-=18;paragraph('ABSTRACT',{font:bold,size:9,line:12,space:7,color:accent});paragraph(article.abstract,{size:10,line:15,space:19});}
    let sectionNo=0;
    for(const item of article.sections){
      if(item.type==='heading'){ensure(38);y-=9;if(!item.level)sectionNo++;paragraph(`${item.level?'':`${sectionNo}. `}${item.title}`,{font:bold,size:item.level?12:15,line:19,space:9,color:accent});}
      else if(item.type==='paragraph')paragraph(item.text);
      else if(item.type==='list')item.items.forEach((value,i)=>paragraph(`${item.ordered?`${i+1}.`:'*'}  ${value}`,{indent:14,space:4}));
    }
    if(article.refs.length){ensure(45);y-=10;paragraph('References',{font:bold,size:15,line:19,space:12,color:accent});article.refs.forEach((ref,i)=>paragraph(`${i+1}. ${ref}`,{size:9.5,line:14,space:7}));}
    const bytes=await pdf.save();return {bytes,pages};
  }
  function download(name){const data=state.files[name];if(!data)return;const blob=data instanceof Blob?data:new Blob([data],{type:name.endsWith('.json')?'application/json':name.endsWith('.tex')?'text/plain':'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function makeReport(){return {generated_at:new Date().toISOString(),format:'Manuscript Lab prototype report',stages:state.stages.map(s=>({name:s.name,status:s.status,logs:s.logs,artifacts:s.artifacts})),validation:state.report||null};}
  async function run(){
    if(state.busy)return;state.busy=true; $('run-btn').disabled=true;$('run-btn').firstElementChild.textContent='Running pipeline…';
    if(state.pdfUrl)URL.revokeObjectURL(state.pdfUrl);state.pdfUrl=null;state.files={};state.report=null;
    $('preview-wrap').replaceChildren();$('preview-wrap').innerHTML='<div class="blank-page"><span class="blank-mark">M.</span><span>Preparing proof</span></div>';
    $('download-actions').hidden=true;$('proof-message').textContent='Processing manuscript…';$('run-summary').textContent='Run in progress';
    state.stages=STAGE_META.map(([name,description])=>({name,description,status:'pending',logs:[],artifacts:[]}));render();
    try{
      stageUpdate(0,'running','Reading XML input…');await pause(130);
      const article=parseXML(input.value);
      state.files['analysis.json']=JSON.stringify({title:article.title,authors:article.authors,abstract:article.abstract,sections:article.sections,refs:article.refs,unsupported:article.unsupported},null,2);
      stageUpdate(0,'success',`Parsed <${article.root}>: ${article.sections.length} body blocks, ${article.refs.length} references, ${article.authors.length} authors.`, 'analysis.json');
      if(Object.keys(article.unsupported).length)state.stages[0].logs.push(`Unsupported structures: ${JSON.stringify(article.unsupported)}. Review omissions in validation.`);
      stageUpdate(1,'running','Selecting publication style…');await pause(110);
      const template=$('template-select').value;
      const templateLabel=template==='modern'?'Research Modern':'Journal Classic';
      state.files['template.json']=JSON.stringify({template:templateLabel,paper:'A4',renderer:'Browser PDF proof',texCompiler:'Not available in hosted prototype'},null,2);
      stageUpdate(1,'success',`${templateLabel} selected. A4 page and typography configured.`, 'template.json');
      stageUpdate(2,'running','Escaping XML text and assembling LaTeX document…');await pause(110);
      state.files['manuscript.tex']=makeTex(article,template);
      stageUpdate(2,'success',`Created manuscript.tex (${state.files['manuscript.tex'].length} characters).`, 'manuscript.tex');
      stageUpdate(3,'running','Evaluating TeX compilation handoff…');await pause(110);
      if($('scenario-select').value==='fail')throw Object.assign(Error('Simulated TeX error: missing journal-template.cls. Inspect .tex and retry with a working scenario.'),{stage:3});
      stageUpdate(3,'simulated','TeX engine skipped: this browser deployment does not execute pdflatex or LuaLaTeX. The .tex source is exportable; PDF proof uses a separate browser renderer.');
      stageUpdate(4,'running','Checking required fields and content coverage…');await pause(110);
      const result=validate(article,$('validation-select').value);state.report=result;
      state.files['validation.json']=JSON.stringify(result,null,2);
      for(const warning of result.warnings)state.stages[4].logs.push(`WARNING: ${warning}`);
      for(const error of result.errors)state.stages[4].logs.push(`${result.mode==='strict'?'ERROR':'WARNING'}: ${error}`);
      if(!result.passed){stageUpdate(4,'error','Strict validation stopped publication. Correct required content and run again.','validation.json');throw Object.assign(Error('Validation failed.'),{handled:true});}
      stageUpdate(4,'success',`Validation complete: ${result.errors.length} required-field finding(s), ${result.warnings.length} warning(s).`,'validation.json');
      stageUpdate(5,'running','Rendering downloadable PDF proof…');await pause(110);
      const {bytes,pages}=await pdfProof(article,template);
      const blob=new Blob([bytes],{type:'application/pdf'});state.files['manuscript-proof.pdf']=blob;
      state.pdfUrl=URL.createObjectURL(blob);
      const frame=document.createElement('iframe');frame.title='Generated manuscript PDF proof';frame.src=state.pdfUrl+'#toolbar=0&navpanes=0';$('preview-wrap').replaceChildren(frame);
      stageUpdate(5,'success',`Produced a real ${pages}-page PDF proof (${Math.round(bytes.length/1024)} KB).`, 'manuscript-proof.pdf');
      $('download-actions').hidden=false;$('proof-message').textContent=`${pages}-page browser proof ready. Download the PDF, generated LaTeX, or full run report.`;
      $('run-summary').textContent=`Complete · ${pages} page${pages===1?'':'s'}`;
    }catch(err){
      if(!err.handled){const i=typeof err.stage==='number'?err.stage:state.stages.findIndex(x=>x.status==='running');stageUpdate(Math.max(i,0),'error',err.message||'Unexpected pipeline error.');}
      $('proof-message').textContent='The run stopped. Select the red stage to inspect the error, correct the input or settings, and run again.';
      $('run-summary').textContent='Run stopped · inspect error';
    }finally{
      state.files['pipeline-report.json']=JSON.stringify(makeReport(),null,2);
      const reportStage=state.stages.findIndex(s=>s.status==='error');
      if(reportStage>=0){state.stages[reportStage].artifacts.push('pipeline-report.json');render();$('download-actions').hidden=false;$('pdf-download').hidden=true;$('tex-download').hidden=!state.files['manuscript.tex'];$('report-download').hidden=false;}
      else{$('pdf-download').hidden=false;$('tex-download').hidden=false;}
      state.busy=false;$('run-btn').disabled=false;$('run-btn').firstElementChild.textContent='Run publishing pipeline';
    }
  }
})();
