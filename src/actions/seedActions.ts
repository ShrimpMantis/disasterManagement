"use server";

import {
  grantBootstrapAdminRole as grantBootstrapAdminRoleCallable,
  listSeedModules as listSeedModulesCallable,
  seedAll as seedAllCallable,
  seedModule as seedModuleCallable,
} from "@/lib/seeding/callable";
import type { SeedModuleName } from "@/lib/seeding/shared";

export async function listSeedModules() {
  return listSeedModulesCallable();
}

export async function seedModule(module: SeedModuleName) {
  return seedModuleCallable(module);
}

export async function seedAll() {
  return seedAllCallable();
}

export async function grantBootstrapAdminRole() {
  return grantBootstrapAdminRoleCallable();
}
