"use strict";
const monthNumbers={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
let courseEvents=[],colours=new Map(),weeklyTests=[],courseLoading=false;
function testDate(test){
  const value=test.scheduledAt||test.scheduledDate;
  if(typeof value!=="string")return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return key(parse(value))===value?value:null;
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(date):null;
}
function testCard(test){return courseCard({subject:test.subject,title:test.name,type:"test",status:test.status,details:`${test.attempts} attempts · ${testDate(test)?`Scheduled ${parse(testDate(test)).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} IST`:"Schedule date not provided by tracker"}`});}
function renderWeekly(){
  const selectedStatus=$("weekly-filter").value,subject=$("subject").value;
  const shown=weeklyTests.filter(test=>(!selectedStatus||test.status===selectedStatus)&&(!subject||test.subject===subject));
  $("weekly-counts").textContent=`${weeklyTests.length} weekly tests · ${weeklyTests.filter(t=>t.status==="completed").length} completed · ${weeklyTests.filter(t=>t.status==="upcoming").length} upcoming · ${shown.length} matching filters`;
  $("weekly-tests").replaceChildren(...(shown.length?shown.map(testCard):[element("p","No weekly tests match these filters.","empty")]));
}
function releaseDate(label,capturedAt){
  const match=String(label||"").trim().match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/);if(!match)return null;
  const number=monthNumbers[match[2].slice(0,3).toLowerCase()],year=Number(match[3]||String(capturedAt||"").slice(0,4));if(!number||!year)return null;
  const value=`${year}-${String(number).padStart(2,"0")}-${match[1].padStart(2,"0")}`;if(key(parse(value))!==value)return null;
  return {value,inferred:!match[3]};
}
function matching(event){return (!$("subject").value||event.subject===$("subject").value)&&(!$("type").value||event.type===$("type").value);}
function courseCard(event){
  const card=element("article",undefined,`entry course-entry kind-${event.type}`);card.style.borderLeftColor=colours.get(event.subject)||"#a0b5a7";
  card.append(element("span",({pdf:"DPP PDF",quiz:"DPP quiz",video:"DPP discussion",lecture:"Lecture count",test:"Test"}[event.type]||event.type),"kind"),element("strong",event.title),element("p",event.subject));
  if(event.chapter)card.append(element("p",event.chapter));if(event.releaseLabel)card.append(element("p",`Release: ${event.releaseLabel}${event.inferred?" · Year inferred from snapshot":""}`,"value"));
  if(event.status)card.append(element("p",`Status: ${event.status}`));if(event.details)card.append(element("p",event.details));return card;
}
const baseRender=render,baseDetails=renderDetails;
renderDetails=function(){
  baseDetails();const events=courseEvents.filter(e=>e.date===selected&&matching(e));
  if(events.length){$("details").querySelector('.empty')?.remove();$("details").append(...events.map(courseCard));}
};
render=function(){
  baseRender();$("next").disabled=false;
  const start=shift(month,-((month.getDay()+6)%7));
  [...$("days").children].forEach((button,index)=>{
    const date=key(shift(start,index)),events=courseEvents.filter(e=>e.date===date&&matching(e));button.disabled=false;
    if(events.length){const markers=element("div",undefined,"markers");for(const subject of [...new Set(events.map(e=>e.subject))]){const dot=element("i");dot.style.backgroundColor=colours.get(subject);dot.title=subject;markers.append(dot);}button.append(markers,element("small",`${events.length} records`));button.setAttribute("aria-label",button.getAttribute("aria-label")+`, ${events.length} DPP resources`);}
  });
  renderWeekly();
};
async function loadCourse(){
 if(courseLoading)return;courseLoading=true;
 try{
  const response=await fetch(SOURCE,{cache:"no-store"});if(!response.ok)throw new Error();const data=await response.json(),state=data.dashboard||data,dpp=state.pw?.dpp;
  if(!dpp)throw new Error();
  const undated=[];courseEvents=[];
  for(const resource of dpp.resources||[]){const date=releaseDate(resource.releaseLabel,resource.capturedAt||dpp.capturedAt);const event={...resource,date:date?.value,inferred:date?.inferred||false};(date?courseEvents:undated).push(event);}
  const chapters=(dpp.chapters||[]).filter(c=>c.lectureCompleted>0),tests=state.pw?.tests||[];
  weeklyTests=tests.filter(test=>/\bweekly\s+test\b/i.test(test.name));
  for(const test of tests){const date=testDate(test);if(date)courseEvents.push({subject:test.subject,title:test.name,type:"test",date,status:test.status,details:`${test.attempts} attempts · Scheduled ${date} IST`});}
  const subjects=[...new Set([...courseEvents,...chapters,...tests].map(e=>e.subject))].sort();colours=new Map(subjects.map((subject,index)=>[subject,`hsl(${Math.round(index*360/subjects.length)} 65% 70%)`]));
  const previous=$("subject").value;$("subject").replaceChildren(new Option("All subjects",""),...subjects.map(s=>new Option(s,s)));$("subject").value=previous;
  $("subject-legend").replaceChildren(...subjects.map(subject=>{const label=element("span",subject);label.style.borderColor=colours.get(subject);return label;}));
  const completed=chapters.reduce((sum,c)=>sum+c.lectureCompleted,0);
  $("coverage").textContent=`${courseEvents.length} dated DPP resources · ${completed} completed lectures (chapter counts) · ${tests.length} tests. DPP releases do not count as study time or streaks.`;
  $("chapter-summary").textContent=`${completed} completed lectures across ${chapters.length} chapters`;
  $("chapters").replaceChildren(...chapters.map(c=>courseCard({subject:c.subject,title:c.name,type:"lecture",status:`${c.lectureCompleted} / ${c.lectureTotal??"?"} completed`,details:"Individual lecture titles and upload/completion dates are not saved in the tracker."})));
  $("test-summary").textContent=`${tests.length} tests · ${tests.filter(t=>!testDate(t)).length} without schedule dates`;
  $("test-inventory").replaceChildren(...tests.map(testCard),...undated.map(courseCard));
  const published=new Date(state.pw?.capturedAt||data.updatedAt);
  $("weekly-status").textContent=`Checked ${new Date().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata"})} IST · PW snapshot ${Number.isFinite(published.getTime())?published.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}):"date unavailable"}. Updates appear after PW data is published to your tracker feed.`;
  render();
 }catch{$("weekly-status").textContent="Could not refresh the published test feed. Retaining the last loaded records; retrying in one minute.";if(!courseEvents.length)$("coverage").textContent="Course inventory could not load. Refresh data to try again.";}
 finally{courseLoading=false;}
}
$("subject").addEventListener("change",render);$("type").addEventListener("change",render);$("refresh").addEventListener("click",loadCourse);loadCourse();
$("weekly-filter").addEventListener("change",renderWeekly);
window.setInterval(()=>{if(!document.hidden)loadCourse();},60000);
window.addEventListener("focus",loadCourse);
