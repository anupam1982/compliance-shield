// export const logger = {
//     info: (message: string) => {
//       console.log(`[INFO] ${message}`);
//     },
  
//     error: (message: string) => {
//       console.error(`[ERROR] ${message}`);
//     }
//   };

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "compliance-shield",
    environment: process.env.NODE_ENV || "development"
  }
});