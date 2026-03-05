const ROLE_PERMISSIONS = {
  director: ['*'],
  admin: [
    'accounting.view',
    'accounting.manage',
    'accounting.export',
    'procurement.view',
    'procurement.manage',
    'procurement.export',
    'sales.view',
    'sales.manage',
    'sales.export',
    'report.view',
    'report.export',
    'users.view',
    'users.manage',
    'users.audit'
  ],
  manager: [
    'accounting.view',
    'accounting.export',
    'procurement.view',
    'procurement.manage',
    'procurement.export',
    'sales.view',
    'sales.manage',
    'sales.export',
    'report.view',
    'report.export',
    'users.view',
    'users.audit'
  ],
  'sales-agent': [
    'sales.view',
    'sales.manage',
    'sales.export',
    'report.view'
  ]
};

function hasPermission(role, permission) {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission
};