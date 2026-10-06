import { MIN_TEXT_CONTRAST, MIN_UI_CONTRAST, TEXT_PAIRS, UI_PAIRS, contrastRatio } from '../contrast';
import { colors, type ColorScheme } from '../tokens';

const schemes: ColorScheme[] = ['light', 'dark'];

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});

describe.each(schemes)('%s theme tokens', (scheme) => {
  const palette = colors[scheme];

  it.each(TEXT_PAIRS)(`text %s on %s reaches ${MIN_TEXT_CONTRAST}:1`, (text, background) => {
    expect(contrastRatio(palette[text], palette[background])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(UI_PAIRS)(`component %s on %s reaches ${MIN_UI_CONTRAST}:1`, (foreground, background) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
  });
});
