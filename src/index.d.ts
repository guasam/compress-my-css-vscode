type CompressionMode = 'stacked' | 'minified' | 'ignore';

interface CompressorSettings {
  compressOnSave?: boolean;
  showInfoDialog?: boolean;
  defaultMode?: CompressionMode;
  spaceAfterRuleSelector?: boolean;
  spaceInsideParantheses?: boolean;
  spaceBetweenProperties?: boolean;
  removeComments?: boolean;
}
