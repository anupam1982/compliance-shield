export interface PolicyPack {
    name: string;
  
    rules: {
      blockSecrets: boolean;
      blockWeakCrypto: boolean;
      blockPII?: boolean;
      blockInsecureHeaders?: boolean;
    };
  
    severityThresholds: {
      critical: number;
      high: number;
    };
  
    description: string;
  }