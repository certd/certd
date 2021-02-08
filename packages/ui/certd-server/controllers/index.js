import Router from 'koa-router'
const router = Router()

router.get('/api/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello CertD!'
  })
})

export default router
