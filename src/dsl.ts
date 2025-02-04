export const dsl = `
h1 t="Welcome to Complex DSL!"
div c="container" {
  p t="This is a paragraph introducing the container's content."
  ul {
    li t="First feature: Simple syntax"
    li t="Second feature: Nestable elements"
    li t="Third feature: Custom attributes"
  }
  p t="Below is a link to a useful resource."
  a h="https://example.com" t="Click Here"
}
footer t="Footer: Thanks for visiting!"
`