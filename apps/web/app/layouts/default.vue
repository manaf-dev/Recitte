<template>
  <div class="flex min-h-svh flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
      Skip to content
    </a>
    <SiteHeader />
    <main id="main" class="animate-fade flex-1"><slot /></main>
    <SiteFooter />
    <SiteToast />
    <ClientOnly>
      <ApplyDialog />
      <RegisterDialog />
      <JoinDialog />
    </ClientOnly>
  </div>
</template>
