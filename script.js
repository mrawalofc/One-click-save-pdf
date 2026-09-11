const filesEl=document.getElementById("files"),pages=document.getElementById("pages"),layoutEl=document.getElementById("layout"),orientationEl=document.getElementById("orientation"),gapEl=document.getElementById("gap"),gapValue=document.getElementById("gapValue"),hint=document.getElementById("hint");
let photos=[];
filesEl.addEventListener("change",e=>{[...e.target.files].forEach(file=>{if(file.type.startsWith("image/")){const r=new FileReader();r.onload=()=>{photos.push({src:r.result,name:file.name});render()};r.readAsDataURL(file)}});e.target.value=""});
layoutEl.onchange=render; orientationEl.onchange=render; gapEl.oninput=()=>{gapValue.textContent=gapEl.value+" mm";render()}; document.getElementById("clear").onclick=()=>{photos=[];render()};
function render(){pages.innerHTML="";hint.style.display=photos.length?"none":"block"; if(!photos.length)return;
const per=+layoutEl.value; const ori=orientationEl.value; const gap=+gapEl.value;
for(let p=0;p<photos.length;p+=per){const page=document.createElement("div");page.className="a4-page "+ori;page.style.gridTemplateColumns=`repeat(${Math.min(per,photos.length-p)},1fr)`;page.style.gap=gap+"mm";page.style.padding=gap+"mm";
for(let i=p;i<Math.min(p+per,photos.length);i++){const item=photos[i],cell=document.createElement("div");cell.className="photo";cell.draggable=true;cell.dataset.i=i;
cell.innerHTML=`<span class="num">${i+1}</span><button title="Remove">×</button><img src="${item.src}" alt="">`;
cell.querySelector("button").onclick=()=>{photos.splice(i,1);render()}; cell.ondragstart=e=>e.dataTransfer.setData("text/plain",i);cell.ondragover=e=>{e.preventDefault();cell.classList.add("drop-active")};cell.ondragleave=()=>cell.classList.remove("drop-active");cell.ondrop=e=>{e.preventDefault();cell.classList.remove("drop-active");const from=+e.dataTransfer.getData("text/plain"),to=+cell.dataset.i;if(from!==to){const x=photos.splice(from,1)[0];photos.splice(to,0,x);render()}};page.appendChild(cell)}pages.appendChild(page)}
}
document.getElementById("savePdf").onclick=async()=>{if(!photos.length){alert("Please add at least one photo.");return}
const {jsPDF}=window.jspdf;const ori=orientationEl.value;const pdf=new jsPDF({orientation:ori,unit:"mm",format:"a4",compress:true});const per=+layoutEl.value,gap=+gapEl.value;const pw=210,ph=297;const W=ori==="portrait"?pw:ph,H=ori==="portrait"?ph:pw;
for(let p=0;p<photos.length;p+=per){if(p)pdf.addPage("a4",ori);const count=Math.min(per,photos.length-p),w=(W-2*gap-(count-1)*gap)/count,h=H-2*gap;
for(let j=0;j<count;j++){const item=photos[p+j];pdf.addImage(item.src,"JPEG",gap+j*(w+gap),gap,w,h,undefined,"FAST")}}
pdf.save("A4-photo-album.pdf")}; render();