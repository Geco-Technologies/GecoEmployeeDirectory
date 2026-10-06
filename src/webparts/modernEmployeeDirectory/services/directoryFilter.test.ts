import {
  applyClientUserFilters,
  buildDirectoryUserFilter,
  parseEmailDomains,
  userMatchesEmailDomains
} from './directoryFilter';

describe('parseEmailDomains', () => {
  it('keeps a single domain as one entry', () => {
    expect(parseEmailDomains('brittenpearsarts.org')).toEqual(['brittenpearsarts.org']);
  });

  it('splits comma and semicolon lists and trims whitespace', () => {
    expect(parseEmailDomains(' brittenpearsarts.org, snapemaltings.co.uk ; example.org ')).toEqual([
      'brittenpearsarts.org',
      'snapemaltings.co.uk',
      'example.org'
    ]);
  });

  it('strips a leading @, lowercases, and drops duplicates', () => {
    expect(parseEmailDomains('@BrittenPearsArts.org; brittenpearsarts.org')).toEqual([
      'brittenpearsarts.org'
    ]);
  });

  it('ignores blank and non-domain tokens', () => {
    expect(parseEmailDomains(' , ; not a domain; snapemaltings.co.uk')).toEqual([
      'snapemaltings.co.uk'
    ]);
  });

  it('returns an empty list when nothing is set', () => {
    expect(parseEmailDomains(undefined)).toEqual([]);
    expect(parseEmailDomains('   ')).toEqual([]);
  });
});

describe('userMatchesEmailDomains', () => {
  const domains: string[] = ['brittenpearsarts.org', 'snapemaltings.co.uk'];

  it('matches either mail or userPrincipalName for any listed domain', () => {
    expect(userMatchesEmailDomains({
      mail: 'ada@brittenpearsarts.org',
      userPrincipalName: 'ada@tenant.onmicrosoft.com'
    }, domains)).toBe(true);

    expect(userMatchesEmailDomains({
      mail: undefined,
      userPrincipalName: 'Bea@SnapeMaltings.co.uk'
    }, domains)).toBe(true);
  });

  it('excludes users outside the listed domains', () => {
    expect(userMatchesEmailDomains({
      mail: 'guest@gmail.com',
      userPrincipalName: 'guest_gmail.com#EXT#@tenant.onmicrosoft.com'
    }, domains)).toBe(false);
  });

  it('uses the same ends-with rule when only one domain is configured', () => {
    const single: string[] = parseEmailDomains('contoso.com');
    expect(userMatchesEmailDomains({ mail: 'a@contoso.com' }, single)).toBe(true);
    expect(userMatchesEmailDomains({ userPrincipalName: 'a@contoso.com' }, single)).toBe(true);
    expect(userMatchesEmailDomains({ mail: 'a@fabrikam.com' }, single)).toBe(false);
  });
});

describe('buildDirectoryUserFilter', () => {
  it('builds an endsWith query for a single domain', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org'
    });

    expect(query.advanced).toBe(true);
    expect(query.filter).toBe(
      "(endswith(mail,'@brittenpearsarts.org') or endswith(userPrincipalName,'@brittenpearsarts.org'))"
    );
  });

  it('ORs every domain so a user matching any domain is included', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org, snapemaltings.co.uk'
    });

    expect(query.advanced).toBe(true);
    expect(query.filter).toBe(
      "(endswith(mail,'@brittenpearsarts.org') or endswith(userPrincipalName,'@brittenpearsarts.org') or endswith(mail,'@snapemaltings.co.uk') or endswith(userPrincipalName,'@snapemaltings.co.uk'))"
    );
  });

  it('ANDs a letter prefix with the domain list', () => {
    const query = buildDirectoryUserFilter({
      filterLetter: "O'Neil",
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org;snapemaltings.co.uk'
    });

    expect(query.filter).toContain("startswith(displayName,'O''Neil') and (endswith(mail,'@brittenpearsarts.org')");
    expect(query.filter).toContain("endswith(userPrincipalName,'@snapemaltings.co.uk'))");
  });

  it('leaves department filtering as a single startswith clause', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'department',
      filterValue: "People's"
    });

    expect(query.advanced).toBe(false);
    expect(query.filter).toBe("startswith(department,'People''s')");
  });

  it('adds a Member userType clause when guests are excluded', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org',
      excludeGuests: true
    });

    expect(query.filter?.startsWith("userType eq 'Member' and ")).toBe(true);
  });

  it('can exclude guests without another filter', () => {
    const query = buildDirectoryUserFilter({ excludeGuests: true });
    expect(query).toEqual({
      filter: "userType eq 'Member'",
      advanced: false
    });
  });

  it('does not emit a domain clause when the value is empty', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'domain',
      filterValue: ' , ; '
    });

    expect(query).toEqual({ filter: undefined, advanced: false });
  });

  it('excludes disabled accounts with accountEnabled eq true', () => {
    expect(buildDirectoryUserFilter({ excludeDisabled: true })).toEqual({
      filter: 'accountEnabled eq true',
      advanced: false
    });
  });

  it('excludes users with no assigned licenses via an advanced count filter', () => {
    expect(buildDirectoryUserFilter({ excludeUnlicensed: true })).toEqual({
      filter: 'assignedLicenses/$count ne 0',
      advanced: true
    });
  });

  it('keeps domain, guest, disabled, and license filters together', () => {
    const query = buildDirectoryUserFilter({
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org, snapemaltings.co.uk',
      excludeGuests: true,
      excludeDisabled: true,
      excludeUnlicensed: true
    });

    expect(query.advanced).toBe(true);
    expect(query.filter).toBe(
      "accountEnabled eq true and assignedLicenses/$count ne 0 and userType eq 'Member' and (endswith(mail,'@brittenpearsarts.org') or endswith(userPrincipalName,'@brittenpearsarts.org') or endswith(mail,'@snapemaltings.co.uk') or endswith(userPrincipalName,'@snapemaltings.co.uk'))"
    );
  });
});

describe('applyClientUserFilters', () => {
  const users = [
    { id: '1', mail: 'ada@brittenpearsarts.org', userPrincipalName: 'ada@brittenpearsarts.org', userType: 'Member' },
    { id: '2', mail: 'bea@snapemaltings.co.uk', userPrincipalName: 'bea@snapemaltings.co.uk', userType: 'Member' },
    { id: '3', mail: 'cy@contoso.com', userPrincipalName: 'cy@contoso.com', userType: 'Member' },
    { id: '4', mail: 'gue@gmail.com', userPrincipalName: 'gue_gmail.com#EXT#@tenant.onmicrosoft.com', userType: 'Guest' }
  ];

  it('keeps users from any configured domain and drops the rest', () => {
    const filtered = applyClientUserFilters(users, {
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org, snapemaltings.co.uk'
    });

    expect(filtered.map(user => user.id)).toEqual(['1', '2']);
  });

  it('drops guest accounts when excludeGuests is set and userType is present', () => {
    const filtered = applyClientUserFilters(users, {
      filterType: 'none',
      excludeGuests: true
    });

    expect(filtered.map(user => user.id)).toEqual(['1', '2', '3']);
  });

  it('keeps a single-domain match on userPrincipalName when mail differs', () => {
    const filtered = applyClientUserFilters([
      { mail: 'other@contoso.com', userPrincipalName: 'ada@brittenpearsarts.org', userType: 'Member' }
    ], {
      filterType: 'domain',
      filterValue: 'brittenpearsarts.org'
    });

    expect(filtered).toHaveLength(1);
  });

  it('drops disabled accounts and users with no assigned licenses', () => {
    const filtered = applyClientUserFilters([
      { id: 'licensed', accountEnabled: true, assignedLicenses: [{ skuId: 'm365' }], userType: 'Member' },
      { id: 'disabled', accountEnabled: false, assignedLicenses: [{ skuId: 'm365' }], userType: 'Member' },
      { id: 'empty', accountEnabled: true, assignedLicenses: [], userType: 'Member' },
      { id: 'missing', accountEnabled: true, userType: 'Member' }
    ], {
      excludeDisabled: true,
      excludeUnlicensed: true
    });

    expect(filtered.map(user => user.id)).toEqual(['licensed']);
  });

  it('keeps disabled and unlicensed users when those filters are off', () => {
    const filtered = applyClientUserFilters([
      { id: 'disabled', accountEnabled: false, assignedLicenses: [] }
    ], {
      excludeDisabled: false,
      excludeUnlicensed: false
    });

    expect(filtered.map(user => user.id)).toEqual(['disabled']);
  });
});
