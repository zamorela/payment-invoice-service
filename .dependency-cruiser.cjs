/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'Domain must not depend on outer layers',
      from: { path: '^src/domain' },
      to: {
        path: '^src/(application|infrastructure|interfaces)',
      },
    },
    {
      name: 'application-no-infra',
      severity: 'error',
      comment: 'Application must not import infrastructure or interfaces',
      from: { path: '^src/application' },
      to: {
        path: '^src/(infrastructure|interfaces)',
      },
    },
    {
      name: 'infrastructure-no-interfaces',
      severity: 'error',
      comment: 'Infrastructure must not import HTTP layer',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/interfaces' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
