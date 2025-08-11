/// <reference types="vite/client" />

declare module '*.tsx' {
  import React from 'react';
  const component: React.ComponentType<any>;
  export default component;
}

declare module '*.ts' {
  const content: any;
  export default content;
}