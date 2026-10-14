"use strict";
const SOURCE = "https://ansh1040.github.io/New/progress.json";
const $ = id => document.getElementById(id);
const todayKey = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const parse = key => {const [y,m,d] = key.split("-").map(Number); return new Date(y,m-1,d,12);};
const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const shift = (date,n) => new Date(date.getFullYear(),date.getMonth(),date.getDate()+n,12);
const duration = minutes => `${Math.floor(minutes/60)}h ${minutes%60}m`;
let selected = todayKey, month = new Date(parse(todayKey).getFullYear(),parse(todayKey).getMonth(),1,12);
let records = new Map(), loaded = false;
function activity(date){return records.get(date) || {minutes:0,sessions:[],tests:[]};}
function active(date){const item=activity(date);return item.minutes>0 || item.tests.length>0;}
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function render(){
  $("month").textContent=month.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const prefix=key(month).slice(0,7), entries=[...records].filter(([date])=>date.startsWith(prefix)&&date<=todayKey&&active(date));
  $("minutes").textContent=loaded?duration(entries.reduce((sum,[,item])=>sum+item.minutes,0)):"—";
  $("active").textContent=loaded?String(entries.length):"—";
  let streak=0,cursor=parse(todayKey);if(!active(todayKey))cursor=shift(cursor,-1);while(active(key(cursor))){streak++;cursor=shift(cursor,-1);}
  $("streak").textContent=loaded?`${streak} ${streak===1?"day":"days"}`:"—";
  $("next").disabled=key(month).slice(0,7)>=todayKey.slice(0,7);
  const start=shift(month,-month.getDay()), cells=[];
  for(let index=0;index<42;index++){
    const date=shift(start,index),dateKey=key(date),item=activity(dateKey),future=dateKey>todayKey;
    const level=!active(dateKey)?0:item.minutes<=30?1:item.minutes<=60?2:item.minutes<=120?3:4;
    const button=element("button",undefined,`day level${level}${date.getMonth()!==month.getMonth()?" outside":""}`);
    button.type="button";button.disabled=future;button.setAttribute("aria-pressed",String(dateKey===selected));
    button.setAttribute("aria-label",`${date.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}, ${item.minutes} study minutes, ${item.tests.length} tests`);
    button.append(element("span",String(date.getDate())));if(active(dateKey))button.append(element("small",item.minutes?`${item.minutes}m`:`${item.tests.length} test${item.tests.length===1?"":"s"}`));
    button.addEventListener("click",()=>{selected=dateKey;render();});cells.push(button);
  }
  $("days").replaceChildren(...cells);renderDetails();
}
function renderDetails(){
  $("selected").textContent=parse(selected).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
  const item=activity(selected);$("day-total").textContent=loaded?`${duration(item.minutes)} focused · ${item.sessions.length} sessions · ${item.tests.length} tests`:"Waiting for published data";
  const children=[];
  if(!loaded){children.push(element("p","Progress data is unavailable. Use Refresh data to try again.","empty"));}
  else if(!active(selected)){children.push(element("p","No activity recorded for this date.","empty"));}
  for(const session of item.sessions){const card=element("article",undefined,"entry");card.append(element("strong",session.subject||"Study session"));if(session.topic)card.append(element("p",session.topic));card.append(element("p",duration(session.minutes),"value"));children.push(card);}
  for(const test of item.tests){const card=element("article",undefined,"entry");card.append(element("strong",test.name||"Practice test"));if(test.subject)card.append(element("p",test.subject));card.append(element("p",`${test.score} / ${test.outOf} marks`,"value"));children.push(card);}
  $("details").replaceChildren(...children);
}
async function load(){
  $("refresh").disabled=true;$("status").textContent="Loading published progress…";
  try{
    const response=await fetch(SOURCE,{cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json(),state=data.dashboard||data;
    if(!Array.isArray(state.sessions)||!Array.isArray(state.tests))throw new Error("Dated records are unavailable");
    const next=new Map();const get=date=>{if(!next.has(date))next.set(date,{minutes:0,sessions:[],tests:[]});return next.get(date);};
    for(const session of state.sessions){if(!/^\d{4}-\d{2}-\d{2}$/.test(session.date)||key(parse(session.date))!==session.date||!Number.isInteger(session.minutes)||session.minutes<=0)continue;const item=get(session.date);item.sessions.push(session);item.minutes+=session.minutes;}
    for(const test of state.tests){if(!/^\d{4}-\d{2}-\d{2}$/.test(test.date)||key(parse(test.date))!==test.date||!Number.isFinite(test.score)||!Number.isFinite(test.outOf))continue;get(test.date).tests.push(test);}
    records=next;loaded=true;const updated=new Date(data.updatedAt||state.updatedAt);
    $("status").textContent=Number.isFinite(updated.getTime())?`Published ${updated.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST`:"Published progress loaded";
  }catch{$("status").textContent=loaded?"Refresh failed. Showing the last loaded records.":"Could not load published progress. Please try again.";}
  finally{$("refresh").disabled=false;render();}
}
$("previous").addEventListener("click",()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1,12);render();});
$("next").addEventListener("click",()=>{if(!$("next").disabled){month=new Date(month.getFullYear(),month.getMonth()+1,1,12);render();}});
$("today").addEventListener("click",()=>{selected=todayKey;const today=parse(todayKey);month=new Date(today.getFullYear(),today.getMonth(),1,12);render();});
$("refresh").addEventListener("click",load);render();load();
