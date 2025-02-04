import { parseDSL } from './converter'
import { dsl } from './dsl'

const parsedHTML = parseDSL(dsl);
const appElement = document.getElementById('app');
if (!appElement) {
  throw new Error('Could not find app element');
}
appElement.innerHTML = parsedHTML;