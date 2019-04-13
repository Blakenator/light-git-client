export class TestConstants {
  static parseDiffCases: DiffCase[] = [
    {
      name: 'two hunk one header',
      content: `diff --git a/folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts b/folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts
index acd72c79..ae6d7a30 100644
--- a/folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts
+++ b/folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts
@@ -18,13 +18,18 @@ describe('SAML Login', () => {
     });
 
     afterEach(() => {
-        Auth.logout();
-
-        // This provider is configured to redirect us to the Okta login page; expect that here
-        browser.driver.wait(ExpectedConditions.urlIs('https://dev-982380.oktapreview.com/login/login.htm'));
-
-        // Put us back into Folio for future tests
-        browser.get(Globals.HOST);
+        browser.getCurrentUrl().then(url => {
+            if (url.indexOf('logout') < 0 && url.indexOf('login') < 0) {
+                // logout if not already logged out
+                Auth.logout();
+
+                // This provider is configured to redirect us to the Okta login page; expect that here
+                browser.driver.wait(ExpectedConditions.urlIs('https://dev-982380.oktapreview.com/login/login.htm'));
+
+                // Put us back into Folio for future tests
+                browser.get(Globals.HOST);
+            }
+        });
     });
 
     it('logs into the application as a SAML user', () => {
@@ -34,7 +39,7 @@ describe('SAML Login', () => {
         expect(Auth.getUserConflictModal().isPresent()).toBeFalsy();
     });
 
-    it('shows a modal when start and finish username different', () => {
+    fit('shows a modal when start and finish username different', () => {
         Auth.loginSamlOkta(samlTomUsername, samlUserEmail, samlPassword);
 
         // back in Angularland`,
      headerCount: 1,
      hunkCount: 2,
      toFilename: 'folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts',
      fromFilename: 'folio-integration-tests/src/test/javascript/pages/external-authentication/saml-authentication.spec.ts',
      hunkData: [
        [
          {fromStart: 18, fromCount: 13, toStart: 18, toCount: 18},
          {fromStart: 34, fromCount: 7, toStart: 39, toCount: 7},
        ],
      ],
    },
    {
      name: 'one hunk one header one line added at end',
      content: `diff --git a/.gitignore b/.gitignore
index d40ef15..f95d6af 100644
--- a/.gitignore
+++ b/.gitignore
@@ -51,3 +51,4 @@ sh.exe.stackdump
 git/**/*.js
 /*.js
 **/*.js.map
+.nyc_output/
`,
      headerCount: 1,
      hunkCount: 1,
      toFilename: '.gitignore',
      fromFilename: '.gitignore',
      hunkData: [
        [
          {fromStart: 51, fromCount: 3, toStart: 51, toCount: 4},
        ],
      ],
    },
    {
      name: 'new file one line',
      content: `diff --git a/asd.txt b/asd.txt
new file mode 100644
index 0000000..d72af31
--- /dev/null
+++ b/asd.txt
@@ -0,0 +1 @@
+asd
`,
      headerCount: 1,
      hunkCount: 1,
      toFilename: 'asd.txt',
      fromFilename: 'asd.txt',
      hunkData: [
        [
          {fromStart: 0, fromCount: 0, toStart: 1, toCount: 1},
        ],
      ],
    },
    {
      name: 'rename no changes',
      content: `diff --git a/log.txt b/log6.txt
similarity index 100%
rename from log.txt
rename to log6.txt`,
      headerCount: 1,
      hunkCount: 0,
      toFilename: 'log6.txt',
      fromFilename: 'log.txt',
      hunkData: [],
    },
  ];
}

interface DiffCase {
  name: string;
  content: string;
  toFilename: string;
  fromFilename: string;
  headerCount: number;
  hunkCount: number;
  hunkData: { fromStart: number, fromCount: number, toStart: number, toCount: number, }[][];
}
