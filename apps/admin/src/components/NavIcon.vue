<script setup lang="ts">
// Small stroke icons for the sidebar (24×24 grid).
export type NavIconName =
  | 'overview'
  | 'programs'
  | 'applications'
  | 'registrations'
  | 'messages'
  | 'testimonials'
  | 'content'
  | 'staff'

const PATHS: Record<NavIconName, string[]> = {
  overview: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  programs: ['M3 5h18v16H3z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  applications: ['M6 2h9l5 5v15H6z', 'M14 2v6h6', 'M9 13h7', 'M9 17h5'],
  registrations: ['M9 11l3 3 8-8', 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  messages: ['M4 4h16v12H8l-4 4z'],
  testimonials: ['M7 7h4v4c0 3-2 5-4 6', 'M15 7h4v4c0 3-2 5-4 6'],
  content: ['M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'],
  staff: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
}

defineProps<{ name: NavIconName }>()
</script>

<template>
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="d in PATHS[name]" :key="d" :d="d" />
  </svg>
</template>
