import React, { useEffect, useMemo, useState } from 'react';

async function ghGet(url: string) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (response.ok) {
        (response as any).data = await response.json();
    }

    return response as Response & { data?: any };
}

export default function Footer() {
    const [ numberOfContributors, setNumberOfContributors ] = useState(0);

    const [ version, setVersion ] = useState<string>();
    const [ latestRelease, setLatestRelease ] = useState<string>();
    const [ license, setLicense ] = useState<string>();
    const [ licenseUrl, setLicenseUrl ] = useState<string>();

    useEffect(() => {
        ghGet('https://api.github.com/repos/aleab/acav-we/contributors').then(res => {
            setNumberOfContributors(res.data ? res.data.length - 1 : 0);
        });
        ghGet('https://api.github.com/repos/aleab/acav-we/releases/latest').then(res => {
            setVersion(res.data?.name ?? undefined);
            setLatestRelease(res.data?.html_url ?? undefined);
        });
        ghGet('https://api.github.com/repos/aleab/acav-we/license').then(res => {
            setLicense(res.data?.license?.spdx_id ?? undefined);
            setLicenseUrl(res.data?.html_url ?? undefined);
        });
    }, []);

    return (
      <footer className="footer">
        <div className="container small">
          <p className="mb-0">
            <span>
              <>Designed, created and maintained by </>
              <a href="https://github.com/aleab">aleab</a>
            </span>
            {
                numberOfContributors > 0 ? (
                  <span>
                    <> with the help of </>
                    <a href="https://github.com/aleab/acav-we/graphs/contributors">{`${numberOfContributors} contributor${numberOfContributors > 1 ? 's' : ''}`}</a>
                  </span>
                ) : null
            }
            <>.</>
          </p>
          <p className="mb-0">
            {
                version ? (
                  <span>
                    <>Current version </>
                    {
                        latestRelease ? (
                          <a href={latestRelease}>{version}</a>
                        ) : (
                          <>{version}</>
                        )
                    }
                    <>. </>
                  </span>
                ) : null
            }
            {
                license ? (
                  <span>
                    <>Code licensed </>
                    {
                        licenseUrl ? (
                          <a href={licenseUrl}>{license}</a>
                        ) : (
                          <>{license}</>
                        )
                    }
                    <>.</>
                  </span>
                ) : null
            }
          </p>
        </div>
      </footer>
    );
}
