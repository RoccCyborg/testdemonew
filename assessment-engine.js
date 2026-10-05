/* Shared assessment engine. Test-specific TEST_CONFIG and DATA are loaded before this file. */
const domainMax = {};
const domainEarned = {};
DATA.domains.forEach(d=>{domainMax[d]=0;domainEarned[d]=0});
DATA.questions.forEach(q=>{domainMax[q.domain]+=(q.type==="mcq"?1:2)});

function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function init(){
 document.getElementById('testTitle').textContent=TEST_CONFIG.title;
 document.getElementById('testMeta').textContent=TEST_CONFIG.subtitle;
 document.title=TEST_CONFIG.title;
 document.getElementById('assessmentDate').value=new Date().toLocaleDateString('en-IN');
 const root=document.getElementById('questions');
 root.innerHTML=DATA.questions.map((q,idx)=>{
   if(q.type==="mcq"){
    return `<div class="card q" data-id="${q.id}" data-domain="${esc(q.domain)}">
      <div class="qnum">Question ${idx+1} · ${esc(q.domain)} · ${esc(q.difficulty)}</div>
      <div class="question">${esc(q.question)}</div>
      ${q.options.map((o,i)=>`<label class="option"><input type="radio" name="q${q.id}" value="${String.fromCharCode(65+i)}"> <b>${String.fromCharCode(65+i)}.</b> ${esc(o)}</label>`).join('')}
    </div>`;
   }
   return `<div class="card q" data-id="${q.id}" data-domain="${esc(q.domain)}">
     <div class="qnum">Question ${idx+1} · ${esc(q.domain)} · One Word</div>
     <div class="question">${esc(q.question)}</div>
     <input type="text" id="q${q.id}" autocomplete="off" placeholder="Type your answer">
   </div>`;
 }).join('');
 updateProgress(); attachListeners();
}
function attachListeners(){
 document.querySelectorAll('input').forEach(el=>el.addEventListener('input',updateProgress));
}
function answeredCount(){
 let n=0;
 DATA.questions.forEach(q=>{
   if(q.type==="mcq"){if(document.querySelector(`input[name="q${q.id}"]:checked`))n++}
   else if(document.getElementById(`q${q.id}`)?.value.trim())n++;
 });
 return n;
}
function updateProgress(){
 const n=answeredCount(), total=DATA.questions.length;
 document.getElementById('progressText').textContent=`${n}/${total} answered`;
 document.getElementById('progressBar').style.width=(n/total*100)+'%';
}
function normalize(s){return s.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g,'').replace(/\s+/g,' ');}
function submitAssessment(){
 const unanswered=DATA.questions.filter(q=>{
   if(q.type==="mcq") return !document.querySelector(`input[name="q${q.id}"]:checked`);
   return !document.getElementById(`q${q.id}`).value.trim();
 });
 if(unanswered.length){
   if(!confirm(`There are ${unanswered.length} unanswered questions. Submit anyway?`)) return;
 }
 let total=0, max=0, correct=0;
 const rows=[];
 DATA.domains.forEach(d=>domainEarned[d]=0);
 DATA.questions.forEach(q=>{
   const pts=q.type==="mcq"?1:2; max+=pts;
   let user="", ok=false;
   if(q.type==="mcq"){user=document.querySelector(`input[name="q${q.id}"]:checked`)?.value||"";ok=user===q.answer}
   else {user=document.getElementById(`q${q.id}`).value.trim();ok=q.accepted.map(normalize).includes(normalize(user))}
   if(ok){total+=pts;domainEarned[q.domain]+=pts;correct++}
   rows.push({q,user,ok,pts});
 });
 renderReport(total,max,correct,rows);
 document.getElementById('report').scrollIntoView({behavior:'smooth'});
}
function band(p){
 if(p>=85)return ["Strong / Job-ready","good"];
 if(p>=70)return ["Functional / Minor gaps","good"];
 if(p>=55)return ["Developing / Needs practice","warn"];
 return ["Foundation required","bad"];
}
function domainAdvice(domain,p){
 const map=TEST_CONFIG.domainAdvice||{};
 return map[domain]||["core concepts","targeted practice"];
}
function renderReport(total,max,correct,rows){
 const pct=Math.round(total/max*100), [label,cls]=band(pct);
 const unanswered=rows.filter(r=>!r.user).length;
 const weak=[...DATA.domains].map(d=>({d,p:Math.round(domainEarned[d]/domainMax[d]*100)})).sort((a,b)=>a.p-b.p);
 const strong=[...weak].sort((a,b)=>b.p-a.p).slice(0,3);
 const report=document.getElementById('report');
 report.classList.remove('hidden');
 let html=`<div class="card"><h2>Assessment Report</h2>
 <div class="grid">
  <div class="metric"><span>Overall score</span><strong>${pct}%</strong><span class="${cls}">${label}</span></div>
  <div class="metric"><span>Points</span><strong>${total}/${max}</strong><span>${correct}/${DATA.questions.length} questions fully correct</span></div>
  <div class="metric"><span>Unanswered</span><strong>${unanswered}</strong><span>Not attempted</span></div>
 </div>
 <p><b>Candidate:</b> ${esc(document.getElementById('candidateName').value||"Candidate")} &nbsp; <b>Date:</b> ${esc(document.getElementById('assessmentDate').value)}</p>
 </div>`;

 html+=`<div class="card"><h3>Cognitive / Skill Domain Profile</h3><div class="grid">`;
 DATA.domains.forEach(d=>{
   const p=Math.round(domainEarned[d]/domainMax[d]*100); const [l,c]=band(p);
   html+=`<div class="metric"><b>${esc(d)}</b><strong>${p}%</strong><div class="bar"><i style="width:${p}%"></i></div><span class="${c}">${l}</span></div>`;
 });
 html+=`</div></div>`;

 html+=`<div class="card"><h3>Core Strengths</h3><p>`;
 strong.forEach(x=>html+=`<span class="pill">${esc(x.d)} — ${x.p}%</span>`);
 html+=`</p><p>These are the areas where the assessment shows comparatively stronger current understanding. Confirm them through practical projects before treating them as job-ready skills.</p></div>`;

 html+=`<div class="card"><h3>Practice Priority</h3><table><tr><th>Domain</th><th>Score</th><th>Interpretation</th><th>Recommended practice</th></tr>`;
 weak.forEach(x=>{
   const [l]=band(x.p), [course,practice]=domainAdvice(x.d,x.p);
   html+=`<tr><td><b>${esc(x.d)}</b></td><td>${x.p}%</td><td>${l}<br><span class="small">${esc(course)}</span></td><td>${esc(practice)}</td></tr>`;
 });
 html+=`</table></div>`;

 html+=`<div class="card"><h3>Recommended Career Practice Path</h3>
 ${(TEST_CONFIG.careerTracks||[]).map(t=>`<p><b>${esc(t.job)}:</b> ${esc(t.practice)}</p>`).join('')}
 </div>`;

 html+=`<div class="card"><h3>Development Decision Rules</h3>
 <ul>
 <li><b>85%+:</b> reinforce through projects and interview simulations.</li>
 <li><b>70–84%:</b> practice identified weak concepts, then reassess.</li>
 <li><b>55–69%:</b> structured course/training plus repeated practical exercises.</li>
 <li><b>Below 55%:</b> rebuild fundamentals before job-specific specialization.</li>
 </ul>
 <p><b>Important:</b> A high written score does not by itself prove job readiness. The next gate should be practical project performance and a live interview/role-play.</p>
 </div>`;

 html+=`<div class="card"><h3>Question Review</h3><p class="small">This section shows the concepts that require review. It intentionally does not replace the full answer key as a learning exercise.</p>`;
 rows.filter(r=>!r.ok).forEach(r=>{
   html+=`<div style="border-top:1px solid var(--line);padding:12px 0">
   <b>Q${r.q.id} — ${esc(r.q.domain)}</b><br>${esc(r.q.question)}<br>
   <span class="bad">Your answer: ${esc(r.user||"Not answered")}</span><br>
   <span class="good">Correct concept: ${esc(r.q.answer)}</span><br>
   <span class="small">${esc(r.q.explanation)}</span>
   </div>`;
 });
 html+=`</div>`;

 html+=`<div class="card no-print"><h3>Save / Print Report</h3>
 <p>Use the button below. Your browser print dialog can save this report as a PDF.</p>
 <button onclick="window.print()">Print / Save Report as PDF</button>
 <button class="secondary" onclick="downloadJSON()">Download Raw Score JSON</button>
 </div>`;

 report.innerHTML=html;
}
function saveDraft(){
 const data={name:document.getElementById('candidateName').value,date:document.getElementById('assessmentDate').value,answers:{}};
 DATA.questions.forEach(q=>{
  if(q.type==="mcq") data.answers[q.id]=document.querySelector(`input[name="q${q.id}"]:checked`)?.value||"";
  else data.answers[q.id]=document.getElementById(`q${q.id}`).value;
 });
 localStorage.setItem('assessmentDraft_'+TEST_CONFIG.id,JSON.stringify(data));
 alert("Progress saved in this browser.");
}
function loadDraft(){
 const raw=localStorage.getItem('assessmentDraft_'+TEST_CONFIG.id);
 if(!raw){alert("No saved draft found.");return}
 const data=JSON.parse(raw);
 document.getElementById('candidateName').value=data.name||"";
 document.getElementById('assessmentDate').value=data.date||"";
 DATA.questions.forEach(q=>{
  const v=data.answers?.[q.id]||"";
  if(q.type==="mcq"){const el=document.querySelector(`input[name="q${q.id}"][value="${v}"]`);if(el)el.checked=true}
  else document.getElementById(`q${q.id}`).value=v;
 });
 updateProgress(); alert("Saved progress loaded.");
}
function resetAssessment(){
 if(!confirm("Reset all answers?"))return;
 localStorage.removeItem('assessmentDraft_'+TEST_CONFIG.id); location.reload();
}
function downloadJSON(){
 const text=document.getElementById('report').innerText;
 const blob=new Blob([JSON.stringify({candidate:document.getElementById('candidateName').value,report:text},null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=TEST_CONFIG.id+'_Assessment_Report.json';a.click();
}
document.addEventListener("input",updateProgress); document.addEventListener("change",updateProgress); init(); updateProgress();
