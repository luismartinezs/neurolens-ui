export const dsl = `
$primary=#2196f3
$dark=#1a237e
$light=#eee

c dir=col w=100vw h=100vh bg=$dark {
  c dir=col align=c pad=32 bg=$dark flex=1 {
    h1 t="Welcome to Complex DSL!" s=36 tc=$light anim=fadeIn 0.5s
    p t="This is a paragraph introducing the container's content." s=16 tc=$light
    ul gap=8 {
      li t="First feature: Simple syntax" s=14 tc=$light
      li t="Second feature: Nestable elements" s=14 tc=$light
      li t="Third feature: Custom attributes" s=14 tc=$light
    }
    p t="Below is a link to a useful resource." s=16 tc=$light
    a h="https://example.com" t="Click Here" bg=$primary tc=white pad=12 br=4 @hover bg=#9c27b0
    @mobile maxw=600 {
      p s=14
      ul gap=4 {
        li s=12
      }
    }
  }
  footer t="Footer: Thanks for visiting!" s=12 tc=$light pad=16
}

@keyframes fadeIn
  from op=0
  to op=1
`