<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { initializeAccountSession } from './services/accountSession';

onMounted(initializeAccountSession);
</script>

<template>
  <RouterView />
</template>
