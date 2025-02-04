export const dsl = `
c .boxes-section pad=40 align=c
  h2 t="Featured Boxes" s=32 tc=#333
  g cols=3 gap=24 pad=24
    c .box pad=24 bg=#f5f5f5 br=8 align=c
      h3 t="Box 1" s=24 tc=#1a237e
      p t="First box content" s=16 tc=#666
    c .box pad=24 bg=#f5f5f5 br=8 align=c
      h3 t="Box 2" s=24 tc=#1a237e
      p t="Second box content" s=16 tc=#666
    c .box pad=24 bg=#f5f5f5 br=8 align=c
      h3 t="Box 3" s=24 tc=#1a237e
      p t="Third box content" s=16 tc=#666
  @mobile maxw=600
    g cols=1 gap=16
`