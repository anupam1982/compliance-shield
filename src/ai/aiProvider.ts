export interface AIRemediationRequest {
    violationType: string;
    severity: string;
    message: string;
    indicator?: string;
  }
  
  export interface AIProvider {
    generateRemediation(
      input: AIRemediationRequest
    ): Promise<string>;
  }