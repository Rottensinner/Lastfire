<script setup lang="ts">
import { computed } from 'vue';
const props=withDefaults(defineProps<{name:string;size?:number}>(),{size:32});
// Ikony interfejsu w logicznej siatce 16 × 16, bez wygładzania.
const house=['.......aa.......','......abba......','.....abbcba.....','....abbccbba....','...abbccccbba...','..abbccccccbba..','.adddddddddddda.','...eeeeeeeeee...','...effeefgge e...'.replace(' ',''),'...effeefgge e...'.replace(' ',''),'...eeeehhheee...','...eeeehhheee...','...eeeehhheee...','..dddddddddddd..','..ii..ii..ii....','................'];
const patterns:Record<string,string[]>={
 fire:['................','........a.......','.......aa.......','.......aba......','....a.aabba.....','....aaaabbba....','...aaaabbbbaa...','...aabbbcbbaa...','...abbcccbbba...','....bbccccbb....','....abbccbba....','.....abbbba.....','...dd.ee.dd.....','..dd.dddd.dd....','...dd....dd.....','................'],
 log:['................','.........aaaa...','.......aabbbbba.','.....aabbbbccba.','...aabbbbcdddcba','..abbbbccdeedcba','.abbbcccdeddccba','.abbccdeddccbaa.','.abcddeddccbaa..','.abcdeedccbaa...','.abccddccbaa....','..abcccbaa......','...abbaa........','................','................','................'],
 plank:['................','..........aa....','........aabba...','......aabbbbba..','....aabbbbcbba..','..aabbbbccbbba..','.abbbbccbbbbba..','.abccbbbbbbbaa..','.abbbbbbbbaa....','.abbbbbbaa......','.abbbbaa........','.abbaa..........','..aa............','................','................','................'],
 stone:['................','................','.......aaa......','.....aabcca.....','....abbcccda....','...abbbcccdda...','...abbbccddda...','..abbbbccddd da..'.replace(' ',''),'..abbbbdddddda..','...abbbbddddda..','....aabddddaa...','......aaaaa.....','................','................','................','................'],
 ingot:['................','................','................','.....aaaaaaaa...','....abbbbbbbca..','...abbbbbbbcca..','..abbbbbbbccca..','.addddddddccca..','.adddddddcccc a..'.replace(' ',''),'.adddddccccca...','..aaaaaaa aaa....'.replace(' ',''),'................','................','................','................','................'],
 food:['................','................','....a...a.......','.....a.a........','................','...bbbbbbbbbb...','..bcccddcceecb..','.bcdccceecddccb.','.bccccddccccccb.','..bffffffffffb..','..bfffffgggggb..','...bfffgggggb...','....bggggggb....','.....bbbbbb.....','................','................'],
 water:['................','........a.......','.......aba......','......abbba.....','.....abbbcca....','.....abbbcca....','....abbbbccca...','...abbbbbcccca..','...abbbbccccca..','...abbbcccccca..','...abbbcccccca..','....abcccccca...','.....aaaaaaa....','................','................','................'],
 book:['................','................','.aaaaaa.aaaaaa..','.abbbbba bbbbba..'.replace(' ',''),'.abcccba bcccba..'.replace(' ',''),'.abbbbba bbbbba..'.replace(' ',''),'.abcccba bcccba..'.replace(' ',''),'.abbbbba bbbbba..'.replace(' ',''),'.abcccba bcccba..'.replace(' ',''),'.abbbbba bbbbba..'.replace(' ',''),'.abbbbba bbbbba..'.replace(' ',''),'.aaaaaa daaaaaa..'.replace(' ',''),'.......d........','................','................','................'],
 tools:['................','...aaaa.........','..abbbba........','.abbbbcaa.......','..aaaccdda......','....accddda.....','.....adddda.....','......adddda....','.......adddda...','........adddda..','.........adddda.','..........addda.','...........aaa..','................','................','................'],
 farm:['................','....a.....a.....','...aba...aba....','....a..a..a.....','...abaabaaba....','....a..a..a.....','....a.aba.a.....','....a..a..a.....','....c..c..c.....','..ccccccccccc...','..ddddddddddd...','...eeeeeeeeee...','..ddddddddddd...','...eeeeeeeeee...','................','................'],
 warehouse:['................','................','...aaaaaa.......','...abbbc a.......'.replace(' ',''),'...abcbca.......','...acbbba.......','...aaaaaa.......','.aaaaaa.aaaaaa..','.abbbca.abbbca..','.abcbca.abcbca..','.acbbba.acbbba..','.aaaaaa.aaaaaa..','................','................','................','................'],
 person:['................','......aaaa......','......abba......','......abba......','.......aa.......','....aaaaaaaa....','....abbbbbba....','....abbbbbba....','....abbbbbba....','....aaabbaaa....','......ac ca......'.replace(' ',''),'......ac ca......'.replace(' ',''),'......ac ca......'.replace(' ',''),'......aa aa......'.replace(' ',''),'................','................']
};
const kind=computed(()=>({hardlog:'log',noblelog:'log',hardplank:'plank',nobleplank:'plank',ore:'stone',copperore:'stone',tinore:'stone',coal:'stone',brick:'ingot',copper:'ingot',bronze:'ingot',hide:'plank',cloth:'plank',logger:'house',quarry:'stone',mine:'house',well:'house',tent:'house',sawmill:'house',mason:'stone',kiln:'house',smelter:'house',smith:'tools',weaver:'house',library:'book'}[props.name]||props.name));
const palette=computed(()=>{
 if(['stone','ore','tinore','ingot','brick','tools','quarry','mason','smith'].includes(props.name))return ['#343b38','#a7aaa0','#d1d1bc','#6f7770','#545d56','#c9ac6c','#68725b','#252b29','#777c51'];
 if(props.name==='coal')return ['#202724','#56605b','#727a6e','#39433d','#171e1a'];
 if(props.name==='water')return ['#234854','#79cbdf','#4084a3'];
 if(props.name==='fire')return ['#b34e1f','#ed8b2f','#ffdf83','#795038','#4d392a'];
 if(props.name==='food')return ['#728b54','#533e2a','#9aaf5d','#d28b42','#e0c17a','#b2804c','#765c39'];
 if(props.name.startsWith('noble'))return ['#6b5c43','#ddc897','#eee0b7','#bdaa7e','#92805b'];
 if(props.name.startsWith('hard'))return ['#302b27','#6d5444','#90745a','#493a31','#c6a279'];
 return ['#533b27','#ba843e','#e5b963','#765134','#946b40','#e7c66d','#66804a','#302d23','#536345'];
});
const pixels=computed(()=>(patterns[kind.value]||house).flatMap((row,y)=>[...row].flatMap((c,x)=>c==='.'?[]:[{x,y,color:palette.value[(c.charCodeAt(0)-97)%palette.value.length]}])));
</script>
<template><svg aria-hidden="true" class="pixel-icon" viewBox="0 0 16 16" :width="size" :height="size" shape-rendering="crispEdges"><rect v-for="(p,i) in pixels" :key="i" :x="p.x" :y="p.y" width="1" height="1" :fill="p.color"/></svg></template>
