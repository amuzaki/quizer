const $ = id => document.getElementById(id);
let parsedQuestions = [], quizQuestions = [], current = 0, answers = [], reviewExpanded = true, sourceName = "";
const home = $("home"), quiz = $("quiz"), results = $("results");
function show(section){[home,quiz,results].forEach(s=>s.classList.toggle("hidden",s!==section));window.scrollTo({top:0,behavior:"smooth"});}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function parseTXT(text){
  const normalized=text.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  const chunks=normalized.split(/^\s*\+{4,}\s*$/m).map(s=>s.trim()).filter(Boolean);
  if(!chunks.length) throw new Error("Не найдено ни одного вопроса. Проверь разделители ++++.");
  const out=[];
  chunks.forEach((chunk,idx)=>{
    const parts=chunk.split(/^\s*={4,}\s*$/m).map(s=>s.trim()).filter(Boolean);
    if(parts.length<3) throw new Error(`В блоке ${idx+1} мало данных: нужны вопрос и минимум два варианта ответа.`);
    const question=parts[0].replace(/\s+/g," ").trim();
    const options=parts.slice(1).map(raw=>({text:raw.replace(/^#\s*/,"").replace(/\s+/g," ").trim(),correct:/^#/.test(raw)})).filter(o=>o.text);
    const correct=options.filter(o=>o.correct).length;
    if(!question) throw new Error(`В блоке ${idx+1} пустой вопрос.`);
    if(options.length<2) throw new Error(`Вопрос «${question}»: нужно минимум два варианта.`);
    if(correct!==1) throw new Error(`Вопрос «${question}»: отметь # ровно у одного правильного варианта (сейчас: ${correct}).`);
    out.push({question,options});
  });
  return out;
}
function setError(msg){$("errors").textContent=msg;$("errors").classList.remove("hidden");}
function clearError(){$("errors").classList.add("hidden");$("errors").textContent="";}
$("fileInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;clearError();
  try{const text=await file.text();parsedQuestions=parseTXT(text);sourceName=file.name;
    $("fileInfo").textContent=`✓ ${file.name} · ${parsedQuestions.length} вопросов`;
    $("fileInfo").classList.remove("hidden");$("startBtn").disabled=false;
  }catch(err){parsedQuestions=[];$("fileInfo").classList.add("hidden");$("startBtn").disabled=true;setError(err.message||"Не удалось прочитать файл.");}
});
const dropzone=$("dropzone");
dropzone.addEventListener("dragover",e=>{e.preventDefault();dropzone.classList.add("dragover")});
dropzone.addEventListener("dragleave",()=>dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop",async e=>{e.preventDefault();dropzone.classList.remove("dragover");const f=e.dataTransfer.files?.[0];if(!f)return;if(!/\.txt$/i.test(f.name)){setError("Выбери файл с расширением .txt");return;}const dt=new DataTransfer();dt.items.add(f);$("fileInput").files=dt.files;$("fileInput").dispatchEvent(new Event("change"));});
$("amount").addEventListener("change",()=> $("customWrap").classList.toggle("hidden",$("amount").value!=="custom"));
$("startBtn").addEventListener("click",()=>{
 if(!parsedQuestions.length)return;
 let pool=[...parsedQuestions];if($("shuffleQuestions").checked)pool=shuffle(pool);
 const amt=$("amount").value;let n=amt==="all"?pool.length:amt==="custom"?Math.max(1,parseInt($("customAmount").value,10)||1):parseInt(amt,10);
 quizQuestions=pool.slice(0,Math.min(n,pool.length)).map(q=>({...q,options:$("shuffleAnswers").checked?shuffle(q.options):[...q.options]}));
 current=0;answers=quizQuestions.map(()=>null);show(quiz);renderQuestion();
});
function renderQuestion(){
 const q=quizQuestions[current];$("counter").textContent=`Вопрос ${current+1} из ${quizQuestions.length}`;
 $("progressBar").style.width=`${((current+1)/quizQuestions.length)*100}%`;
 $("questionText").textContent=q.question;$("answers").innerHTML="";$("feedback").className="feedback hidden";
 const mode=$("mode").value, chosen=answers[current], locked=mode==="practice"&&chosen!==null;
 $("answeredTag").textContent=chosen===null?"Не отвечено":(q.options[chosen]?.correct?"Отвечено · верно":"Отвечено");
 q.options.forEach((opt,i)=>{
  const b=document.createElement("button");b.className="answer";b.type="button";
  if(chosen===i)b.classList.add("selected");
  if(locked&&opt.correct)b.classList.add("correct");
  if(locked&&chosen===i&&!opt.correct)b.classList.add("wrong");
  b.disabled=locked;
  const letter=document.createElement("span");letter.className="letter";letter.textContent=String.fromCharCode(65+i);
  const txt=document.createElement("span");txt.textContent=opt.text;b.append(letter,txt);b.addEventListener("click",()=>choose(i));$("answers").appendChild(b);
 });
 if(mode==="practice"&&chosen!==null){const ok=q.options[chosen].correct;$("feedback").className=`feedback ${ok?"good":"bad"}`;$("feedback").textContent=ok?"Верно! Отличный ответ.":`Не совсем. Правильный ответ: ${q.options.find(o=>o.correct).text}`;}
 $("prevBtn").disabled=current===0;$("prevBtn").style.opacity=current===0?".45":"1";
 $("nextBtn").textContent=current===quizQuestions.length-1?"Завершить квиз":"Далее →";
}
function choose(i){if($("mode").value==="practice"&&answers[current]!==null)return;answers[current]=i;renderQuestion();}
$("prevBtn").addEventListener("click",()=>{if(current>0){current--;renderQuestion();}});
$("nextBtn").addEventListener("click",()=>{if(current<quizQuestions.length-1){current++;renderQuestion();}else finish();});
$("exitBtn").addEventListener("click",()=>{if(confirm("Выйти из квиза? Текущий прогресс будет потерян."))show(home);});
function finish(){
 const correct=quizQuestions.reduce((n,q,i)=>n+(answers[i]!==null&&q.options[answers[i]].correct?1:0),0);
 const wrong=answers.reduce((n,a,i)=>n+(a!==null&&!quizQuestions[i].options[a].correct?1:0),0), skipped=answers.filter(a=>a===null).length;
 const pct=Math.round(correct/quizQuestions.length*100);
 $("scorePercent").textContent=pct+"%";$("scoreFraction").textContent=`${correct} из ${quizQuestions.length}`;
 $("correctCount").textContent=correct;$("wrongCount").textContent=wrong;$("skippedCount").textContent=skipped;
 $("resultTitle").textContent=pct===100?"Идеальный результат!":pct>=80?"Отличная работа!":pct>=50?"Хороший прогресс!":"Есть что повторить";
 $("resultSubtitle").textContent=`Квиз «${sourceName}» завершён`;
 $("resultMark").textContent=pct>=80?"✓":"↗";renderReview();show(results);
}
function renderReview(){
 const list=$("reviewList");list.innerHTML="";
 quizQuestions.forEach((q,i)=>{
  const chosen=answers[i], correct=q.options.find(o=>o.correct);
  if(!reviewExpanded&&chosen!==null&&q.options[chosen].correct)return;
  const item=document.createElement("article");item.className="review-item";
  const h=document.createElement("h3");h.textContent=`${i+1}. ${q.question}`;item.appendChild(h);
  const your=document.createElement("p");your.className="answer-line";your.textContent="Твой ответ: "+(chosen===null?"Не отвечено":q.options[chosen].text);item.appendChild(your);
  if(chosen===null||!q.options[chosen].correct){const right=document.createElement("p");right.className="right-line";right.textContent="Правильный ответ: "+correct.text;item.appendChild(right);}
  else {your.className="right-line";your.textContent="✓ Твой ответ: "+q.options[chosen].text;}
  list.appendChild(item);
 });
 $("toggleReview").textContent=reviewExpanded?"Показать только ошибки":"Показать все";
}
$("toggleReview").addEventListener("click",()=>{reviewExpanded=!reviewExpanded;renderReview();});
$("restartBtn").addEventListener("click",()=>{$("startBtn").click();});
$("homeBtn").addEventListener("click",()=>show(home));
$("themeBtn").addEventListener("click",()=>{
 const root=document.documentElement,currentTheme=root.dataset.theme;
 const systemDark=window.matchMedia("(prefers-color-scheme: dark)").matches;
 root.dataset.theme=currentTheme? (currentTheme==="dark"?"light":"dark"):(systemDark?"light":"dark");
 $("themeBtn").title="Тема: "+root.dataset.theme;
});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
