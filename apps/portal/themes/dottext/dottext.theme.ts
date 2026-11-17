// The dottext theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in dottext.settings.json and the generated dottext.settings.ts;
// change them with `astryx experimental theme editor set dottext ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {dottextSettings} from './dottext.settings';

export const dottextTheme = defineTheme({
  extends: dottextSettings,
  name: 'dottext',
});
