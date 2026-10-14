"use strict";
const monthNumbers={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
let courseEvents=[],colours=new Map();
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
};
async function loadCourse(){
 try{
  const response=await fetch(SOURCE,{cache:"no-store"});if(!response.ok)throw new Error();const data=await response.json(),state=data.dashboard||data,dpp=state.pw?.dpp;
  if(!dpp)throw new Error();
  const undated=[];courseEvents=[];
  for(const resource of dpp.resources||[]){const date=releaseDate(resource.releaseLabel,resource.capturedAt||dpp.capturedAt);const event={...resource,date:date?.value,inferred:date?.inferred||false};(date?courseEvents:undated).push(event);}
  const chapters=(dpp.chapters||[]).filter(c=>c.lectureCompleted>0),tests=state.pw?.tests||[];
  const subjects=[...new Set([...courseEvents,...chapters,...tests].map(e=>e.subject))].sort();colours=new Map(subjects.map((subject,index)=>[subject,`hsl(${Math.round(index*360/subjects.length)} 65% 70%)`]));
  const previous=$("subject").value;$("subject").replaceChildren(new Option("All subjects",""),...subjects.map(s=>new Option(s,s)));$("subject").value=previous;
  $("subject-legend").replaceChildren(...subjects.map(subject=>{const label=element("span",subject);label.style.borderColor=colours.get(subject);return label;}));
  const completed=chapters.reduce((sum,c)=>sum+c.lectureCompleted,0);
  $("coverage").textContent=`${courseEvents.length} dated DPP resources · ${completed} completed lectures (chapter counts) · ${tests.length} tests. DPP releases do not count as study time or streaks.`;
  $("chapter-summary").textContent=`${completed} completed lectures across ${chapters.length} chapters`;
  $("chapters").replaceChildren(...chapters.map(c=>courseCard({subject:c.subject,title:c.name,type:"lecture",status:`${c.lectureCompleted} / ${c.lectureTotal??"?"} completed`,details:"Individual lecture titles and upload/completion dates are not saved in the tracker."})));
  $("test-summary").textContent=`${tests.length} tests · schedule dates unavailable`;
  $("test-inventory").replaceChildren(...tests.map(t=>courseCard({subject:t.subject,title:t.name,type:"test",status:t.status,details:`${t.attempts} attempts · Scheduled date not recorded`})),...undated.map(courseCard));render();
 }catch{$("coverage").textContent="Course inventory could not load. Refresh data to try again.";}
}
$("subject").addEventListener("change",render);$("type").addEventListener("change",render);$("refresh").addEventListener("click",loadCourse);loadCourse();
