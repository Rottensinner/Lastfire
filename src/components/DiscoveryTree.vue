<script setup lang="ts">
import {computed} from 'vue';
import {researches} from '../data';
import {visibleResearch,has} from '../engine';
import type {GameState} from '../types';
import PixelIcon from './PixelIcon.vue';
const props=defineProps<{game:GameState;selected:string}>();
const emit=defineEmits<{select:[id:string]}>();
const branches=[...new Set(researches.map(r=>r.branch))];
const depth=(id:string):number=>{const r=researches.find(r=>r.id===id)!;return r.requires.length?1+Math.max(...r.requires.map(depth)):0;};
const nodes=computed(()=>{const used=new Set<string>();return researches.filter(r=>visibleResearch(props.game,r.id)).map(r=>{let row=depth(r.id),col=branches.indexOf(r.branch);while(used.has(`${col}:${row}`))row++;used.add(`${col}:${row}`);return {...r,x:col*102+51,y:row*104+45};});});
const height=computed(()=>Math.max(250,...nodes.value.map(r=>r.y+65)));
const edges=computed(()=>nodes.value.flatMap(n=>n.requires.flatMap(id=>{const p=nodes.value.find(n=>n.id===id);return p?[{id:id+'-'+n.id,x1:p.x,y1:p.y+27,x2:n.x,y2:n.y-27}]:[];})));
</script>
<template><div class="tree-legend"><span>◇ Do zbadania</span><span class="positive">✓ Odkryte</span><span>✦ Premia / znalezisko</span></div><p class="muted tree-intro">Kliknij ikonę. Dalsze węzły ujawnią się po spełnieniu wszystkich wymagań.</p><div class="tree-scroll"><div class="tree-columns"><span v-for="branch in branches" :key="branch">{{branch}}</span></div><div class="tree-canvas" :style="{height:height+'px'}"><svg class="tree-lines" width="612" :height="height" aria-hidden="true"><path v-for="e in edges" :key="e.id" :d="`M ${e.x1} ${e.y1} C ${e.x1} ${e.y1+35}, ${e.x2} ${e.y2-35}, ${e.x2} ${e.y2}`"/></svg><button v-for="n in nodes" :key="n.id" class="discovery-node" :class="{chosen:selected===n.id,known:has(game,n.id),researching:game.research?.id===n.id,special:n.kind!=='research'}" :style="{left:(n.x-28)+'px',top:(n.y-28)+'px'}" :aria-label="`${n.name}${has(game,n.id)?' — odkryto':''}`" :aria-pressed="selected===n.id" :title="n.name" @click="emit('select',n.id)"><PixelIcon :name="n.icon" :size="40"/><span>{{has(game,n.id)?'✓':game.research?.id===n.id?'…':n.kind!=='research'?'✦':'◇'}}</span></button></div></div></template>
