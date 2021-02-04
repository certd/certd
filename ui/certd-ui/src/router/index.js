import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Detail from '../views/detail/index.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/detail',
    name: 'detail',
    component: Detail
    // component: () => import(/* webpackChunkName: "about" */ '../views/About.vue'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
