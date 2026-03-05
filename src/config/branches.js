const BRANCHES = ['Maganjo', 'Matugga'];

function isValidBranch(branch) {
  return BRANCHES.includes(branch);
}

function toBranchCode(branch) {
  if (branch === 'Maganjo') {
    return 'MG';
  }

  if (branch === 'Matugga') {
    return 'MT';
  }

  return 'NA';
}

module.exports = {
  BRANCHES,
  isValidBranch,
  toBranchCode
};