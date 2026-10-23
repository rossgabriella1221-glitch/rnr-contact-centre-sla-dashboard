"use client";

const knownPhotos = new Map([["aiszack","Aiszack"],["anthony","Anthony"],["ash","Ash"],["benjamin","Benjamin"],["cindy","Cindy"],["clyde","Clyde"],["delona","Delona"],["didi","Didi"],["edmund","Edmund"],["eva","Eva"],["fadley","Fadley"],["faidila","Faidila"],["fino","Fino"],["firda","Firda"],["haizat","Haizat"],["hasri","Hasri"],["hazel","Hazel"],["hidayah","Hidayah"],["jammi","Jammi"],["julia","Julia"],["karim","Karim"],["karmilah","Karmilah"],["kelvin","Kelvin"],["lucas","Lucas"],["mariyam","Mariyam"],["mary","Mary"],["masnee","Masnee"],["michelle","Michelle"],["misha","Misha"],["nicholas","Nicholas"],["nora","Nora"],["qah","Qah"],["quraisha","Quraisha"],["ros","Ros"],["rose","Rose"],["ross","Ross"],["roy","Roy"],["serina","Serina"],["shaera","Shaera"],["shahira","Shahira"],["shamuni","Shamuni"],["shariza","Shariza"],["shirley","Shirley"],["sue","Sue"],["vodka","Vodka"],["william","William"],["yaya","Yaya"],["yina","Yina"],["yusri","Yusri"]]);
const aliases: Record<string,string> = { aizack:"Aiszack", sariza:"Shariza", shariza:"Shariza", rossi:"Ross" };
export function AgentPhoto({ name, size = 42 }: { name: string; size?: number }) {
  const key = name.trim().toLowerCase().replace(/[^a-z]/g,"");
  const filename = knownPhotos.get(key) ?? aliases[key];
  if (!filename) return <span aria-hidden="true" style={{display:"inline-flex",width:size,height:size,borderRadius:"50%",background:"#304966",color:"#fff",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>{name.trim().slice(0,1).toUpperCase()}</span>;
  return <img src={`/agent-photos/${filename}.jpg`} alt={`${name} profile`} width={size} height={size} loading="lazy" style={{width:size,height:size,objectFit:"cover",borderRadius:"50%",border:"2px solid #91a9c9",flexShrink:0}} />;
}
