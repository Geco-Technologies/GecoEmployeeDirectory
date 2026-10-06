/**
 * Directory query helpers for the property-pane organisation filter.
 * Domain matching stays aligned with the original single-domain rule:
 * a user is included when mail or userPrincipalName ends with @domain.
 * Multiple domains are OR'd so a user matching any domain is included.
 */

export interface IAssignedLicense {
  skuId?: string;
  disabledPlans?: string[];
}

export interface IDirectoryUserIdentity {
  mail?: string;
  userPrincipalName?: string;
  userType?: string;
  accountEnabled?: boolean;
  assignedLicenses?: IAssignedLicense[];
}

export interface IDirectoryQueryOptions {
  filterLetter?: string;
  filterType?: string;
  filterValue?: string;
  filterSecondaryValue?: string;
  excludeGuests?: boolean;
  /** Drop Entra accounts with accountEnabled eq false. */
  excludeDisabled?: boolean;
  /** Drop users whose assignedLicenses collection is missing or empty. */
  excludeUnlicensed?: boolean;
}

export interface IDirectoryQuery {
  /** OData $filter expression. Omitted when nothing is constrained. */
  filter?: string;
  /**
   * endsWith and assignedLicenses/$count require ConsistencyLevel: eventual and $count=true.
   */
  advanced: boolean;
}

const DOMAIN_PATTERN: RegExp = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const EXTENSION_ATTRIBUTE_PATTERN: RegExp = /^[A-Za-z][A-Za-z0-9]*$/;

export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Split a property-pane filter value into unique email domains.
 * Accepts commas or semicolons, ignores blank tokens, and strips a leading @.
 */
export function parseEmailDomains(raw?: string): string[] {
  if (!raw) {
    return [];
  }

  const seen: Set<string> = new Set<string>();
  const domains: string[] = [];

  for (const token of raw.split(/[,;]/)) {
    let domain: string = token.trim().toLowerCase();
    if (domain.startsWith('@')) {
      domain = domain.slice(1);
    }
    while (domain.endsWith('.')) {
      domain = domain.slice(0, -1);
    }
    if (!domain || seen.has(domain) || !DOMAIN_PATTERN.test(domain)) {
      continue;
    }
    seen.add(domain);
    domains.push(domain);
  }

  return domains;
}

export function userMatchesEmailDomains(user: IDirectoryUserIdentity, domains: string[]): boolean {
  if (domains.length === 0) {
    return true;
  }

  const mail: string | undefined = user.mail?.toLowerCase();
  const upn: string | undefined = user.userPrincipalName?.toLowerCase();

  return domains.some((domain: string) => {
    const suffix: string = `@${domain}`;
    return (!!mail && mail.endsWith(suffix)) || (!!upn && upn.endsWith(suffix));
  });
}

export function buildDomainODataFilter(domains: string[]): string | undefined {
  if (domains.length === 0) {
    return undefined;
  }

  const clauses: string[] = [];
  for (const domain of domains) {
    const suffix: string = escapeODataString(`@${domain}`);
    clauses.push(`endswith(mail,'${suffix}')`);
    clauses.push(`endswith(userPrincipalName,'${suffix}')`);
  }

  return `(${clauses.join(' or ')})`;
}

export function userHasAssignedLicense(user: IDirectoryUserIdentity): boolean {
  return Array.isArray(user.assignedLicenses) && user.assignedLicenses.length > 0;
}

export function buildDirectoryUserFilter(options: IDirectoryQueryOptions): IDirectoryQuery {
  const parts: string[] = [];
  let advanced: boolean = false;

  if (options.excludeDisabled) {
    parts.push('accountEnabled eq true');
  }

  if (options.excludeUnlicensed) {
    parts.push('assignedLicenses/$count ne 0');
    advanced = true;
  }

  if (options.excludeGuests) {
    parts.push("userType eq 'Member'");
  }

  if (options.filterLetter) {
    parts.push(`startswith(displayName,'${escapeODataString(options.filterLetter)}')`);
  }

  if (options.filterType && options.filterType !== 'none' && options.filterValue) {
    switch (options.filterType) {
      case 'department':
        parts.push(`startswith(department,'${escapeODataString(options.filterValue)}')`);
        break;
      case 'location':
        parts.push(`startswith(officeLocation,'${escapeODataString(options.filterValue)}')`);
        break;
      case 'extension':
        if (options.filterSecondaryValue && EXTENSION_ATTRIBUTE_PATTERN.test(options.filterValue)) {
          parts.push(
            `onPremisesExtensionAttributes/${options.filterValue} eq '${escapeODataString(options.filterSecondaryValue)}'`
          );
        }
        break;
      case 'domain': {
        const domainFilter: string | undefined = buildDomainODataFilter(parseEmailDomains(options.filterValue));
        if (domainFilter) {
          parts.push(domainFilter);
          advanced = true;
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    filter: parts.length > 0 ? parts.join(' and ') : undefined,
    advanced
  };
}

export function applyClientUserFilters<T extends IDirectoryUserIdentity>(
  users: T[],
  options: IDirectoryQueryOptions
): T[] {
  let result: T[] = users;

  if (options.excludeDisabled) {
    result = result.filter((user: T) => user.accountEnabled !== false);
  }

  if (options.excludeUnlicensed) {
    result = result.filter((user: T) => userHasAssignedLicense(user));
  }

  if (options.excludeGuests) {
    result = result.filter((user: T) => !user.userType || user.userType === 'Member');
  }

  if (options.filterType === 'domain') {
    const domains: string[] = parseEmailDomains(options.filterValue);
    if (domains.length > 0) {
      result = result.filter((user: T) => userMatchesEmailDomains(user, domains));
    }
  }

  return result;
}
