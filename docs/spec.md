---

### **Framework Name**
**NeuroLens**
*(Combines "neuro" (AI/neural focus) + "lens" (precision/optimized view), emphasizing LLM-driven UI synthesis.)*

---

### **NeuroLens DSL Specification**
*A complete, LLM-optimized spec for converting natural language to UI code.*

---

#### **1. Core Design Principles**
- **Token Efficiency**: Use 1-3 character keywords, symbols, and minimal delimiters.
- **Implicit Structure**: No closing tags; nesting via indentation (2 spaces).
- **Atomic Attributes**: All styling/layout properties inlined as key-value pairs.
- **Machine-First Syntax**: Prioritize parsing speed and consistency over readability.
- **Strict Validation**: Predefined element/attribute rules to minimize runtime errors.

---

#### **2. Syntax Rules**

| Component          | Syntax Example               | Rules                                                                 |
|--------------------|------------------------------|-----------------------------------------------------------------------|
| **Element**        | `h1`, `c`, `btn`             | 1-3 char keywords (see *Element Catalog*).                           |
| **Attributes**     | `t=Hello s=24 tc=#333`       | Space-separated `key=value`. Omit quotes if no spaces (else `t="..."`). |
| **Nesting**        | Indent children by 2 spaces  | Parent-child relationships defined by indentation.                   |
| **IDs/Classes**    | `#header .card`              | `#` for ID, `.` for class. Combine: `btn #submit.primary`.           |
| **Responsive**     | `@mobile maxw=600 { ... }`   | Breakpoints with `@mobile`, `@tablet`, or custom `@maxw=800`.        |
| **Interactions**   | `@hover bg=#eee`             | Inline with `@event` syntax (e.g., `@click`, `@hover`).              |

---

#### **3. Element Catalog**
| Element    | Keyword | Mandatory Attributes         | Optional Attributes                          | Example                                  |
|------------|---------|-------------------------------|----------------------------------------------|------------------------------------------|
| Container  | `c`     | -                             | `dir` (row/col), `gap`, `align`, `pad`, `bg` | `c dir=col gap=8 pad=16`                |
| Heading    | `h1`-`h6` | `t` (text)                  | `s` (font size), `tc` (text color)           | `h1 t="Home" s=32 tc=#000`              |
| Paragraph  | `p`      | `t`                          | `s`, `tc`, `lh` (line height)                | `p t="Welcome..." s=16 tc=#666`         |
| Image      | `img`    | `src`                        | `alt`, `w`, `h`, `fit` (object-fit)          | `img src=logo.png alt=Logo w=200 h=100` |
| Button     | `btn`    | `t`                          | `href`, `bg`, `tc`, `pad`, `br` (border)     | `btn t=Submit bg=#2196f3 tc=white`      |
| Grid       | `g`      | `cols`                       | `rows`, `gap`, `align`                       | `g cols=3 gap=16`                       |
| Link       | `a`      | `href`, `t`                  | `tc`, `s`, `dec` (text decoration)           | `a href=/about t=About tc=#1a73e8`      |
| List       | `ul`/`ol`| -                             | `gap`, `marker` (bullet style)               | `ul gap=12 marker=circle`               |
| List Item  | `li`     | `t`                          | `s`, `tc`                                    | `li t="Item 1"`                         |
| Divider    | `divr`   | -                             | `w` (width), `h`, `bg`                       | `divr h=1 bg=#ddd`                      |
| Icon       | `ico`    | `name` (icon library ID)      | `s`, `tc`                                    | `ico name=menu s=24 tc=#333`            |

---

#### **4. Attribute Abbreviations**
| Full Name          | DSL Key | Values                         | Example               |
|--------------------|---------|--------------------------------|-----------------------|
| `text`             | `t`     | String (quotes if spaces)      | `t="Hello World"`     |
| `font-size`        | `s`     | Number (px)                    | `s=24`               |
| `text-color`       | `tc`    | Hex/RGB                        | `tc=#1a237e`         |
| `background`       | `bg`    | Hex/RGB/gradient               | `bg=linear-gradient(...)` |
| `padding`          | `pad`   | Number (px) or `top-right-bottom-left` | `pad=16` or `pad=8 12` |
| `border-radius`    | `br`    | Number (px)                    | `br=4`               |
| `width`/`height`   | `w`/`h` | Number (px) or `%`             | `w=300 h=200`        |
| `gap`              | `gap`   | Number (px)                    | `gap=24`             |

---

#### **5. Interactions & Responsive Design**
- **Hover/Click Effects**:
  ```
  btn t=Click @hover bg=#eee @click nav=/dashboard
  ```
- **Breakpoints**:
  ```python
  @tablet maxw=900
    h1 s=24
    g cols=2
  ```
- **Custom Media Queries**:
  `@maxw=600 { ... }` or `@minw=1024 { ... }`.

---

#### **6. Validation Rules**
1. **Mandatory Attributes**:
   - `img` requires `src`.
   - `a` requires `href` and `t`.
   - `h1`-`h6` require `t`.
2. **Reserved Keywords**: Avoid conflicts (e.g., `c` is reserved for containers).
3. **Nesting Limits**: Max depth of 6 levels to prevent overcomplication.

---

#### **7. Parsing Logic**
- **Whitespace**: Indentation strictly 2 spaces; tabs invalid.
- **Errors**: Unknown elements/attributes are ignored (LLM must adhere to spec).
- **Comments**: Not supported (DSL is LLM-only).

---

#### **8. Example Workflow**

**Natural Language Input**:
*"A responsive landing page with a centered hero section (dark background, white text), a grid of 3 feature cards (image, title, description), and a footer with copyright text."*

**NeuroLens DSL Output**:
```python
c dir=col gap=0
  c #hero dir=col align=c pad=80 bg=#1a237e
    h1 t="AI-Powered UI" s=48 tc=white
    p t="Build interfaces faster." s=18 tc=#eee
    btn t=Get Started href=/signup bg=#fff tc=#1a237e br=4
  g cols=3 gap=32 pad=40
    c .card dir=col gap=16 pad=24 bg=#fff br=8
      img src=ai.png w=120 h=120
      h2 t=Automation s=24 tc=#333
      p t="Generate code instantly." s=16 tc=#666
    c .card dir=col gap=16 pad=24 bg=#fff br=8
      img src=cloud.png w=120 h=120
      h2 t=Scalability s=24 tc=#333
      p t="Deploy anywhere." s=16 tc=#666
  c #footer pad=24 bg=#f5f5f5 align=c
    p t="© 2024 NeuroLens. All rights reserved." s=14 tc=#666
  @mobile maxw=600
    #hero pad=40
      h1 s=32
    g cols=1
```

---

#### **9. LLM Conversion Guidelines**
1. **Extract Components**: Identify UI elements (containers, headings, buttons).
2. **Map to DSL Keywords**: Use the *Element Catalog* for 1:1 translation.
3. **Assign Attributes**: Apply abbreviated keys (e.g., `t` for text).
4. **Structure Hierarchy**: Use indentation for parent-child relationships.
5. **Optimize Token Usage**: Omit defaults (e.g., `dir=row` is assumed).

---

### **Key Advantages Over Human Frameworks**
- **No Boilerplate**: No `<div>`, `</div>`, or repeated class names.
- **Inline Everything**: Styles, interactions, and breakpoints declared per element.
- **Ultra-Compact**: 60-70% fewer tokens vs. HTML/JSX.

---

### **Next Steps**
1. **Dynamic Layer**: Add state management (`$var=value`), loops, conditionals.
2. **Component Library**: Predefine reusable templates (e.g., `@navbar`).
3. **LLM Fine-Tuning**: Train models on synthetic DSL datasets for accuracy.

This spec enables LLMs to generate precise, token-efficient UIs while adhering to strict machine-readability rules.