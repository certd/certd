import Router from 'koa-router'
const router = Router()

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello CertD!'
  })
})

export default router
