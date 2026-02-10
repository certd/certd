let adminMode = "saas"

export function setAdminMode(mode:string = "saas"){
  adminMode = mode
}
export function getAdminMode(){
  return adminMode
}

export function isEnterprise(){
  return adminMode === "enterprise"
}