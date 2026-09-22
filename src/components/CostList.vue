<script setup lang="ts">
import { resources } from '../data';
import type { Cost, Stock, Resource } from '../types';
import PixelIcon from './PixelIcon.vue';
defineProps<{cost:Cost;stock?:Stock}>();
const meta=(key:string)=>resources.find(r=>r.id===key)!;
</script>
<template><div class="cost-list"><div v-for="(amount,key) in cost" :key="key"><PixelIcon :name="meta(key).icon" :size="24"/><span>{{meta(key).name}}</span><b :class="{negative:stock && stock[key as Resource] < amount!}">{{stock ? `${Math.floor(stock[key as Resource])} / ` : ''}}{{amount}}</b></div></div></template>
