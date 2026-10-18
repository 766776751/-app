import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/HomeView.vue') },
    { path: '/trip/add', name: 'trip-add', component: () => import('@/pages/AddTripView.vue') },
    { path: '/expense', name: 'expense', component: () => import('@/pages/ExpenseView.vue') },
    {
      path: '/expense/history',
      name: 'expense-history',
      component: () => import('@/pages/ExpenseHistoryView.vue'),
    },
    {
      path: '/expense/add',
      name: 'expense-add',
      component: () => import('@/pages/AddExpenseView.vue'),
    },
    {
      path: '/expense/:id/edit',
      name: 'expense-edit',
      component: () => import('@/pages/EditExpenseView.vue'),
    },
    { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsView.vue') },
    {
      path: '/destinations',
      name: 'destinations',
      component: () => import('@/pages/DestinationsView.vue'),
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/pages/ProjectTemplatesView.vue'),
    },
    {
      path: '/recycle-bin',
      name: 'recycle-bin',
      component: () => import('@/pages/RecycleBinView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
