import { Context } from "probot";
import { RepositoryContextInfo } from "../types/githubContext";
import { ComplianceStorage } from "../types/storage";
import { RepoFileStorage } from "./repoFileStorage";

export function createComplianceStorage(
  context: Context,
  repoInfo: RepositoryContextInfo
): ComplianceStorage {
  return new RepoFileStorage(context, repoInfo);
}