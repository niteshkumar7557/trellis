# MongoDB: design record

Status: **stage 8 in progress, 15 Nov 2026 (session stopped near the owner's limit).**
Done: stages 1 to 7; `shared/data/mongodb.ts` written, wired in, `npm test` passing (329),
frontend checks clean, `npm run subject -- mongodb` with nothing worth a second look. A
first look in the browser (stage 9, partial): /start shows MongoDB with its four goals
(Node.js 54 topics, Go 57, Mongoose 55, all 82); the map opens with every big topic open
and "Next: Documents and collections". **Still to do:** triage the file-stage review
(three reviewers, R2 practitioner, R4 format auditor, R5 goal walker, were started; their
reports were not triaged this session: re-run them), the rest of stage 9 (hovers, a
selected topic, the list view), and stage 10 (freshness, `npm run seed:graph` and
`npm run test:integration` with the dev databases up, CLAUDE.md's subjects line, which
needs the owner's yes). Branch `feature/subject-mongodb`.
Versions: **MongoDB 9.0** (9.0.8, 10 Nov 2026), **Node.js driver 7.9.0**, **Go driver
v2.10.0**, **Mongoose 9.12.1**, **mongosh 2.14.2**.

This is a **new subject**, designed from official sources with `docs/subject-blueprint.md`.
It credits nothing. The sketch in the blueprint's §12 was a method example and is not the
starting point.

## Sources

Every page below was opened during the session (15 Nov 2026), by the session itself in a
browser (Playwright, for MongoDB University, which renders only with JavaScript) or by a
`web-fetch` agent reading the primary page. Search snippets were used only as leads.

| Job | Source | URL | Version | Checked |
|---|---|---|---|---|
| What exists, what is current | Server release notes index | https://www.mongodb.com/docs/manual/release-notes/ | current stable **9.0**; previous stable 8.3, 8.0, 7.0; docs selector shows 9.1 "Upcoming" | 15 Nov 2026 |
| What exists, what is current | Release notes for MongoDB 9.0, and Compatibility Changes in 9.0 | https://www.mongodb.com/docs/manual/release-notes/9.0/, …/9.0-compatibility/ | 9.0.0 (28 Sep 2026) to 9.0.8 (10 Nov 2026) | 15 Nov 2026 |
| What exists, what is current | Release notes and compatibility changes for 8.0, 8.2 (with 8.1's changes), 8.3 | https://www.mongodb.com/docs/manual/release-notes/8.0/, …/8.0-compatibility/, …/8.2/, …/8.2-compatibility/, …/8.3/, …/8.3-compatibility/ | 8.0, 8.1, 8.2, 8.3 | 15 Nov 2026 |
| What exists, what is current | MongoDB lifecycle schedules | https://www.mongodb.com/legal/support-policy/lifecycles | 9.0 to Oct 2031; 8.3 and 8.0 to Oct 2029; 7.0 to Aug 2027; 8.2 ended Jul 2026 | 15 Nov 2026 |
| What exists | The Database Manual, sidebar to two levels (read in a browser), and its page index | https://www.mongodb.com/docs/manual/ (and each section page), https://www.mongodb.com/docs/llms.txt, …/manual/manual-1-llms.txt to manual-10-llms.txt | 9.0 (Current) | 15 Nov 2026 |
| What exists | Docs: Get Started, Management (self-managed) sidebars | https://www.mongodb.com/docs/get-started/, https://www.mongodb.com/docs/manual/administration/backup/ | 9.0 | 15 Nov 2026 |
| What exists | Specific facts checked on their own page: validation levels; `mongocryptd`; map-reduce; LDAP | https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/, …/core/queryable-encryption/reference/mongocryptd/, …/core/map-reduce/, …/core/security-ldap/ | 9.0 | 15 Nov 2026 |
| What exists, what is current | Node.js driver docs, release notes and upgrade guide; GitHub releases | https://www.mongodb.com/docs/drivers/node/current/ (…/reference/release-notes/, …/reference/upgrade/), https://github.com/mongodb/node-mongodb-native/releases | **7.9.0** (12 Nov 2026); needs Node.js 20.19+ | 15 Nov 2026 |
| What exists, what is current | Mongoose site, migration guide to 9, releases | https://mongoosejs.com/, https://mongoosejs.com/docs/migrating_to_9.html, https://github.com/Automattic/mongoose/releases | **9.12.1** (9 Nov 2026), on driver 7.8 | 15 Nov 2026 |
| What exists, what is current | PyMongo docs, release notes, Motor migration guide | https://www.mongodb.com/docs/languages/python/pymongo-driver/current/ (…/reference/release-notes/, …/reference/migration/) | PyMongo **4.19**; Motor deprecated 14 May 2026 for PyMongo's async API | 15 Nov 2026 |
| What exists, what is current | mongosh changelog; Compass docs; Database Tools | https://www.mongodb.com/docs/mongodb-shell/changelog/, https://www.mongodb.com/docs/compass/current/, https://www.mongodb.com/docs/database-tools/ | mongosh **2.14.2** (11 Nov 2026); Database Tools **100.20.1** | 15 Nov 2026 |
| What exists, what is current | Atlas pricing; Flex migration; Atlas CLI local deployments; self-managed Search | https://www.mongodb.com/pricing, https://www.mongodb.com/docs/atlas/flex-migration/, https://www.mongodb.com/docs/atlas/cli/current/atlas-cli-deploy-fts/, https://www.mongodb.com/docs/search/self-managed/current/ | Free (M0, 512 MB), Flex, Dedicated; M2/M5 and Serverless gone | 15 Nov 2026 |
| Scope | **Associate Developer exam** page | https://learn.mongodb.com/pages/mongodb-associate-developer-exam | 53 questions, 75 min, $150, English, online proctored | 15 Nov 2026 |
| Scope | Associate Developer **objectives and weights**. The official study guide needs a MongoDB University sign-in, so the objectives come from two public copies that say they follow it, and agree with each other | https://github.com/yixin0829/mongodb-dev-cert-prep, https://github.com/c2vasu/mongodb-associate-study-guide | guide edition not stated; the first copy dates from Apr 2025 (server 8.0) | 15 Nov 2026 |
| Scope | **Associate Data Modeler**, **Associate DBA**, **Associate Atlas Administrator** exam pages | https://learn.mongodb.com/pages/mongodb-associate-data-modeler-exam, …/mongodb-associate-database-administrator-exam, …/mongodb-associate-atlas-administrator-exam | 75 q / 110 min; 75 q / 90 min; 70 q / 95 min | 15 Nov 2026 |
| Scope and order | MongoDB University: **Node.js Developer Path** (13 items, about 20 h), **Introduction to MongoDB** (11 units, 15 h), **Data Modeling Path** (8 skills, 8 h) | https://learn.mongodb.com/learning-paths/mongodb-nodejs-developer-path, …/introduction-to-mongodb, …/mongodb-data-modeling-certification-learning-path | as published | 15 Nov 2026 |
| Core and stuck | Stack Overflow: the 100 most-voted questions in each of `mongodb`, `mongoose`, `mongodb-query` and `aggregation-framework` (400 questions; read through the Stack Exchange API with the owner's permission) | `https://api.stackexchange.com/2.3/questions?sort=votes&tagged=<tag>&site=stackoverflow` | 2009 to 2020; lasting pain, not current APIs | 15 Nov 2026 |
| Core and stuck | Schema design anti-patterns (and each of its five pages); design patterns; data modelling overview | https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/ (and sub-pages), …/data-modeling/design-patterns/, …/data-modeling/ | 9.0 | 15 Nov 2026 |
| What working people use | Development checklist; operations checklist; production notes; security checklist; indexing strategies; the ESR guideline | https://www.mongodb.com/docs/manual/administration/production-checklist-development/, …/production-checklist-operations/, …/production-notes/, …/security-checklist/, …/applications/indexes/, …/tutorial/equality-sort-range-guideline/ | 9.0 | 15 Nov 2026 |
| What exists | Node.js driver docs sidebar, every section (read in a browser) | https://www.mongodb.com/docs/drivers/node/current/ and its connect/, crud/, aggregation/, data-formats/, security/, monitoring-and-logging/, reference/ pages | 7.x | 15 Nov 2026 |
| What exists, what is current | Go driver docs (table of contents, context, CSOT, transactions, connection options), upgrade guide, v2 migration guide, releases, API reference | https://www.mongodb.com/docs/drivers/go/current/ (and …/llms.txt, …/reference/upgrade/, …/context/, …/connect/connection-options/csot/, …/crud/transactions/), https://github.com/mongodb/mongo-go-driver/blob/master/docs/migration-2.0.md, https://github.com/mongodb/mongo-go-driver/releases, https://pkg.go.dev/go.mongodb.org/mongo-driver/v2/bson | **v2.10.0** (6 Nov 2026); module `go.mongodb.org/mongo-driver/v2`; Go 1.25+; v1.17 security fixes only | 15 Nov 2026 |
| What exists | Mongoose guides index | https://mongoosejs.com/docs/guides.html | 9.12.1 | 15 Nov 2026 |
| Core and stuck | Stack Overflow, Go: the 100 most-voted `mongo-go` questions and 60 most-voted `go`+`mongodb` (same API, same permission) | as above, `tagged=mongo-go` and `tagged=go;mongodb` | 2012 to 2024 (`mgo`-era questions marked as such) | 15 Nov 2026 |
| What exists, what is current | Atlas Free cluster limits; MongoDB's Vercel guide (added in round 1) | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/, https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/ | Free runs 8.0; backups can be on; 500 connections; Vercel needs `0.0.0.0/0` | 15 Nov 2026 |
| What exists, what is current | MongoDB Search on Community Edition: GA announcement; self-managed compatibility table (round 1) | https://www.mongodb.com/products/updates/now-ga-mongodb-search-and-vector-search-for-community-edition/, https://www.mongodb.com/docs/search/self-managed/current/deployment/compatibility-requirements/ | GA 30 Jun 2026; server 8.3 listed, 9.0 not | 15 Nov 2026 |
| What exists, what is current | Node.js driver 7.8.0 release notes (round 1) | https://github.com/mongodb/node-mongodb-native/releases/tag/v7.8.0 | `timeoutMS` deprecated, a no-op (CVE-2026-119179) | 15 Nov 2026 |
| Core and stuck | Mongoose validation guide (round 1) | https://mongoosejs.com/docs/validation.html | update validators off by default; `unique` is not a validator | 15 Nov 2026 (reviewer R3) |
| Core and stuck (security) | MongoDB FAQ on query injection; OWASP Web Security Testing Guide, "Testing for NoSQL Injection" (round 1; MongoDB's FAQ covers only server-side JavaScript, so OWASP is the source for operators in request bodies) | https://www.mongodb.com/docs/manual/faq/fundamentals/, https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection | 9.0; WSTG latest | 15 Nov 2026 (reviewers R2, R3) |
| What working people use | Stack Overflow Developer Survey 2025, Databases | https://survey.stackoverflow.co/2025/technology | 2025: MongoDB 24% of all respondents (6th), **28.5% of people learning to code (4th)** | 15 Nov 2026 |

**Not reached:** the official study guides behind a sign-in (the Associate Developer
objectives are taken from two agreeing copies; see Open questions), and the Data
Modeler, DBA and Atlas Administrator objectives (their scope is taken from their learning
paths instead).

## What changed recently

From the release notes and compatibility pages above. **Bold** = a curriculum must not
show the old way as current.

**MongoDB 9.0** (major, 28 Sep 2026; latest patch 9.0.8, 10 Nov 2026)

- **Server-side JavaScript is no longer deprecated**: `$where`, `$function` and
  `$accumulator` run on a new WebAssembly-based engine. Its dates are now UTC, and it is
  not available on ppc64le. (Deprecated in 8.0, back in 9.0.)
- **A new validation level, `constraint`**: every insert and update is checked *and* every
  document already in the collection is guaranteed to satisfy the rules; it needs the
  `error` or `errorAndLog` action. `strict` stays the default; `moderate` is unchanged.
- **`mongocryptd` is deprecated**; use the Automatic Encryption Shared Library.
- Queryable Encryption: **prefix, suffix and substring queries are generally available**;
  the 8.2 preview query types (`prefixPreview`, …) are removed.
- Each query has a memory limit (by default 1 GB or 20% of memory, whichever is greater),
  and explain output reports its peak memory. The 100 MB limit per stage is unchanged.
- The server limits open multi-document transactions (`maxConcurrentMultiDocumentTransactions`,
  default 10,000; beyond it, `TooManyOpenTransactions`).
- Query stats (`$queryStats`) on by default, sampling 1%; they now cover inserts, updates
  and deletes.
- Time series collections are stored as one namespace with compressed buckets and can be
  renamed.
- Change streams: a `getMore` after an election can return `InterruptedDueToReplStateChange`;
  drivers resume by themselves, but hand-written loops must resume with `resumeAfter`.
- `$group` errors on an accumulator with an empty field name; a query can fail with
  `QueryKilledError` when an indexed field becomes multikey during it.
- `mongosync` is not supported with 9.0 (8.2 notes).

**MongoDB 8.3** (minor, May 2026, supported to Oct 2029)

- The **Cost-Based Ranker** chooses plans for eligible queries by default.
- New expressions: `$toArray`, `$toObject`, `$subtype`, `$createObjectId`, `$hash`,
  `$serializeEJSON`, and others; `$convert` takes a `base`; `$scoreFusion` is GA.
- `removeShard` deprecated for the new shard-draining commands.

**MongoDB 8.2** (minor, Sep 2025, already end of life) and **8.1** (Atlas only)

- **Hedged reads removed** (8.1).
- Queryable Encryption prefix/suffix/substring as a preview (8.2; GA in 9.0).

**MongoDB 8.0** (major, Oct 2024, supported to Oct 2029)

- **LDAP authentication and authorization deprecated** ("will be removed in a future
  major release"); still works through 8.x and 9.0. Not a current choice for new work.
- **Index filters deprecated** for query settings (`setQuerySettings`).
- **Equality to `null` no longer matches `undefined`**; the `undefined` BSON type is
  deprecated.
- A new `bulkWrite` **command** that writes across collections in one request.
- Queryable Encryption range queries; `$toUUID`; `"majority"` write concern acknowledges
  once a majority has written the oplog entry.

**Older, still relevant to what learners find online**

- **Map-reduce is deprecated since 5.0**; the aggregation pipeline replaces it.
- **The legacy `mongo` shell is gone**: the manual's old page for it
  (`/docs/manual/reference/mongo/`) now redirects to the `mongosh` docs; every current
  tutorial uses `mongosh` (2.14.2).
- **Node.js driver 7** (current 7.9.0; **use 7.8 or later**: 7.8 fixed the `timeoutMS` pool
  bug and SRV host checks, 7.9 an OIDC token leak; Mongoose 9.12 pins `~7.8`): needs
  Node.js 20.19+ (Node.js 20 itself reached end of life on 30 Apr 2026: use 22 or 24 LTS); callbacks were removed in
  driver 5; since driver 6 `findOneAndUpdate` returns the document itself, so old code
  reading `result.value` gets `undefined`; cursors no longer default to a batch size of
  1000; cursor `transform` removed. **The old `useNewUrlParser` and `useUnifiedTopology`
  options were removed in 7** (they were harmless no-ops until 6; now they are an error).
  **`timeoutMS` is deprecated and does nothing from 7.8 and 6.22** (CVE-2026-119179:
  after a timeout the pool could hand one user's data to another); use
  `serverSelectionTimeoutMS`, `socketTimeoutMS`, `waitQueueTimeoutMS` and `maxTimeMS`. 7.8
  also split `createIndex`'s options into index options and command options (the
  two-argument form is deprecated; 7.9 un-deprecated the one-argument form). (Sources: the driver's upgrade guide and the 7.8.0 release
  notes, both read 15 Nov 2026.)
- **Go driver v2** (v2.10.0, 6 Nov 2026; module `go.mongodb.org/mongo-driver/v2`; Go
  1.25+): `primitive` merged into `bson` (`bson.ObjectID`); `mongo.Connect` takes no
  context; untyped nested documents decode as `bson.D`, not `bson.M`; per-operation
  `MaxTime` removed for context deadlines or the client `Timeout` (marked experimental);
  sessions are a struct and transaction callbacks take a plain `context.Context`. v1.17
  gets security fixes only. Answers that use `mgo` are older still.
- **Mongoose 9** (current 9.12.1): no `next()` in pre middleware (async functions instead),
  update pipelines off unless asked for (`updatePipeline`), `returnDocument` preferred to
  `new` and `returnOriginal` (which still work, with a warning), `FilterQuery` renamed
  `QueryFilter`. Older majors that MERN tutorials still show: **6** dropped `useCreateIndex`,
  `useFindAndModify`, `useNewUrlParser` and `useUnifiedTopology`; **7** removed callbacks
  and `remove()` and made `strictQuery` false by default (unknown filter fields reach the
  server); **8** removed `findOneAndRemove`, `findByIdAndRemove`, `count()` and
  `rawResult`. (Mongoose's migration guides to 6, 7, 8 and 9, as read by reviewer R2.)
- **mongosh:** `insert()`, `update()`, `remove()` and `save()` are the old ways; use
  `insertOne`/`insertMany`, `updateOne`/`updateMany`, `deleteOne`/`deleteMany`.
- **Motor deprecated** (14 May 2026) for PyMongo's async API.
- **Atlas App Services' Data API, HTTPS endpoints and Device Sync have ended** (Atlas's
  App Services deprecation page): there is no supported way for a browser or phone app to
  talk to MongoDB directly; it calls the app's own API.
- **Atlas:** the Free cluster (M0) **ran MongoDB 8.0 when checked**; students can't
  upgrade it, and Atlas moves it to a newer version after several patch releases, so 9.0's
  features (marked **(9.0)** in the plan) may not be there yet; 512 MB, 500 connections, a
  cap on operations per second, `allowDiskUse` ignored, no server-side JavaScript, no
  private endpoints; **backups can be turned on** (a daily snapshot, four kept); paused
  after 30 days with no connections (source: Atlas's "Free cluster limits" page, read
  15 Nov 2026). Flex costs up to $30 a month. **M2, M5 and Serverless instances are
  gone** (since 22 Jan 2026 and Mar 2025). `atlas deployments` is deprecated for
  **`atlas local`**; its image (`mongodb/mongodb-atlas-local`) runs Search on a laptop.
- **"MongoDB Search" and "MongoDB Vector Search"** are the products' names now (the docs
  say "MongoDB Search"; "Atlas Search" is the old name students will still search for).
  **Generally available on Community Edition since 30 Jun 2026**, through `mongot`, a
  separate process; its compatibility table lists server 8.3 (9.0 not yet, checked
  15 Nov 2026).

## Coverage

The inventory (stage 3): every item the sources list, one row each, and where it went
(filled in stage 5). Ids in "Went to" are subtopics of the plan below; "out:" means left
out, with the reason.

Counted against the sources:

| Source | Rows | Ids |
|---|---|---|
| Database Manual sidebar: 25 top-level sections and every second-level page (read in a browser) | 110 | D1 to D110 |
| Database Manual pages outside the sidebar (from the page index: security, storage, administration, tutorials, FAQ, troubleshooting, reference concepts) | 30 | M1 to M30 |
| Docs portal: Get Started, Management, Tools, other products | 25 | G1 to G25 |
| Node.js driver docs sidebar | 15 | N1 to N15 |
| Go driver docs table of contents, and the v2 breaking changes | 16 | GO1 to GO16 |
| Mongoose guides | 14 | MG1 to MG14 |
| Associate Developer exam objectives (scope only; no goal) | 43 | E1.1 to E6.10 |
| MongoDB University: Node.js Developer Path, Introduction to MongoDB, Data Modeling Path | 25 | C1 to C25 |
| Other certifications (scope only) | 3 | X1 to X3 |
| Best-practice pages: anti-patterns, patterns, checklists, ESR, production notes | 32 | B1 to B32 |
| Learner pain: Stack Overflow (560 questions in six tags, grouped by theme with votes) | 63 | P1 to P63 |
| **Total** | **376** | |

### Database Manual sidebar (9.0)

| # | Section | Page | Went to |
|---|---|---|---|
| D1 | Overview | What is MongoDB? | mg-what |
| D2 | Documents | (section page: structure, embedded documents, arrays) | mg-json, mg-embedded |
| D3 | Documents | Use Cases | mg-when |
| D4 | Databases & Collections | (section page) | mg-what |
| D5 | Databases & Collections | Views | mg-out-merge |
| D6 | Databases & Collections | On-Demand Materialized Views | mg-out-merge |
| D7 | Databases & Collections | Capped Collections | out: a niche for fixed-size logs; TTL indexes (mg-ttl) and time series (mg-time-series) do the jobs learners have |
| D8 | Databases & Collections | Clustered Collections | out: a storage optimisation for one access pattern, outside every goal |
| D9 | Sample Data | | mg-sample-data |
| D10 | Client Libraries | | mg-node-connect, mg-go-connect; other languages out (owner: Node.js and Go) |
| D11 | Connect to a Cluster | (section page) | mg-conn-string |
| D12 | Connect to a Cluster | Atlas Cluster Connection | mg-atlas |
| D13 | Connect to a Cluster | Connection Strings | mg-conn-string |
| D14 | Connect to a Cluster | Authentication | mg-auth |
| D15 | Connect to a Cluster | Atlas IP Access List | mg-network, mg-atlas |
| D16 | Connect to a Cluster | Network Peering | out: paid-tier networking; mg-network names private networking as the production choice |
| D17 | Connect to a Cluster | Cloud Provider Access | out: same reason |
| D18 | Connect to a Cluster | Private Endpoints | mg-network (named) |
| D19 | Connect to a Cluster | AWS Lambda | mg-app-client (one client per process, reused between calls) |
| D20 | Connect to a Cluster | Azure Functions | mg-app-client |
| D21 | Connect to a Cluster | Google Cloud Functions | mg-app-client |
| D22 | Connect to a Cluster | Troubleshoot Connection Issues | mg-conn-trouble |
| D23 | Database Users | (section page) | mg-auth |
| D24 | Database Users | Configure Database Users in Atlas | mg-atlas, mg-auth |
| D25 | CRUD Operations | (section page) | mg-crud's subtopics |
| D26 | CRUD Operations | Create | mg-insert |
| D27 | CRUD Operations | Read | mg-find, mg-query's subtopics |
| D28 | CRUD Operations | Update | mg-update, mg-updates's subtopics |
| D29 | CRUD Operations | Delete | mg-delete |
| D30 | CRUD Operations | SQL to MongoDB | mg-vs-sql |
| D31 | CRUD Operations | Natural Language to MongoDB | out: an AI feature of Compass and Atlas, not a skill to study |
| D32 | CRUD Operations | Causal Consistency and Read and Write Concerns | mg-write-concern, mg-read-concern |
| D33 | CRUD Operations | Atomicity & Transactions | mg-atomic-doc |
| D34 | CRUD Operations | Text Search | mg-text-index |
| D35 | CRUD Operations | MongoDB CRUD Concepts | mg-cursors, mg-write-results |
| D36 | CRUD Operations | Periods & Dollar Signs | mg-limits |
| D37 | Indexes | (section page) | mg-index-why |
| D38 | Indexes | Create | mg-single-index |
| D39 | Indexes | Drop | mg-single-index |
| D40 | Indexes | Types | mg-single-index (each type goes to its own row below) |
| D41 | Indexes | Single Field | mg-single-index |
| D42 | Indexes | Compound | mg-compound |
| D43 | Indexes | Multikey | mg-multikey |
| D44 | Indexes | Wildcard | out: for fields whose names can't be known in advance; mg-patterns (the attribute shape) covers the usual reason for them |
| D45 | Indexes | Geospatial | mg-geo |
| D46 | Indexes | Hashed | mg-hashed-ranged |
| D47 | Indexes | Text | mg-text-index |
| D48 | Indexes | Clustered | out: see D8 |
| D49 | Indexes | Properties (unique, partial, sparse, TTL, hidden, case-insensitive) | mg-unique, mg-partial, mg-ttl, mg-index-cost (hidden), mg-regex (case-insensitive) |
| D50 | Indexes | Builds | mg-index-cost |
| D51 | Indexes | Manage | mg-single-index |
| D52 | Indexes | Measure Use | mg-index-cost |
| D53 | Indexes | Strategies | mg-compound (ESR), mg-index-cost |
| D54 | Data Modeling | (section page) | mg-schema-why |
| D55 | Data Modeling | Best Practices (with "Handle Duplicate Data" and "Data Consistency") | mg-schema-why, mg-embed-ref, mg-duplication |
| D56 | Data Modeling | Designing Your Schema | mg-schema-why |
| D57 | Data Modeling | Schema Design Patterns | mg-patterns, mg-versioning |
| D58 | Data Modeling | Schema Design Anti-Patterns | mg-antipatterns |
| D59 | Data Modeling | Model Relationships | mg-relations, mg-embed-ref |
| D60 | Data Modeling | Model Tree Structures | mg-trees |
| D61 | Data Modeling | Example Application Models (atomic operations, money, keyword search, IoT) | mg-atomic-doc, mg-bson-types (money), mg-text-index, mg-time-series |
| D62 | Aggregation Operations | (section page) | mg-pipeline |
| D63 | Aggregation Operations | Aggregation Pipeline (and its stage reference) | mg-pipeline, mg-stages; single stages folded into the jobs that use them (mg-group, mg-unwind, mg-lookup, mg-facet, mg-out-merge) |
| D64 | Search | | mg-atlas-search, mg-search-index, mg-autocomplete |
| D65 | Vector Search | | mg-vector |
| D66 | Time Series | (section page) | mg-time-series |
| D67 | Time Series | Quick Start | mg-time-series |
| D68 | Time Series | Time Series Data | mg-time-series |
| D69 | Time Series | Considerations | mg-time-series |
| D70 | Time Series | Create & Configure | mg-time-series |
| D71 | Time Series | Query | mg-time-series |
| D72 | Change Streams | (section page) | mg-watch, mg-stream-filter (a pipeline on `watch()`, full documents and pre-images) |
| D73 | Change Streams | Production Recommendations | mg-resume |
| D74 | Change Streams | Change Stream Events | mg-watch |
| D75 | Transactions | (section page) | mg-transactions |
| D76 | Transactions | Drivers API | mg-transactions |
| D77 | Transactions | Operations | mg-tx-when |
| D78 | Transactions | Production Considerations | mg-tx-when, mg-tx-retry |
| D79 | Transactions | Sharded Clusters | mg-tx-when (named as a limit) |
| D80 | Data Federation | | out: an Atlas product for querying files in cloud storage; outside every goal |
| D81 | In-Use Encryption | (section page) | mg-encryption |
| D82 | In-Use Encryption | Comparing Approaches | mg-encryption |
| D83 | In-Use Encryption | Cryptographic Primitives | out: specialist detail; the summary names the two approaches only |
| D84 | In-Use Encryption | Keys and Key Vaults | mg-encryption (named) |
| D85 | In-Use Encryption | Queryable Encryption | mg-encryption |
| D86 | In-Use Encryption | Client-Side Field Level Encryption | mg-encryption |
| D87 | Development Checklist | | mg-app-client, mg-write-concern, mg-app-retries (see B12 to B16) |
| D88 | Replication | (section page) | mg-rs-what |
| D89 | Replication | Oplog | mg-oplog |
| D90 | Replication | Data Synchronization | mg-oplog |
| D91 | Replication | Replica Set Members (arbiter, hidden, delayed, priority 0) | mg-rs-what, mg-rs-members |
| D92 | Replication | Read & Write Semantics | mg-write-concern, mg-read-pref, mg-read-concern |
| D93 | Replication | Replication Reference | out: a reference list |
| D94 | Sharding | (section page) | mg-shard-when |
| D95 | Sharding | Sharded Cluster Components | mg-shard-arch |
| D96 | Sharding | Shard Keys | mg-shard-key |
| D97 | Sharding | Maintain Uniqueness | mg-shard-key (named as a limit) |
| D98 | Sharding | Hashed Sharding | mg-hashed-ranged |
| D99 | Sharding | Ranged Sharding | mg-hashed-ranged |
| D100 | Sharding | Data Partitioning | mg-balancer |
| D101 | Sharding | Unsharded Collections | mg-reshard |
| D102 | Sharding | Balancer | mg-balancer, mg-zones (zones are managed through the balancer; the sharding tutorials' "Manage Shard Zones") |
| D103 | Sharding | Long-Running Secondary Reads | out: an operations edge case |
| D104 | Performance | (section page) | mg-slow-queries |
| D105 | Performance | Connection Pool | mg-app-client |
| D106 | Performance | Performance Tuning | mg-working-set, mg-query-settings |
| D107 | Charts | | out: an Atlas dashboard product, not MongoDB itself |
| D108 | Reference | (operators, commands, `mongosh` methods, limits, glossary) | folded: operators into the jobs that use them (mg-compare, mg-field-ops, mg-stages and so on); limits into mg-limits; not one box per operator (blueprint §5) |
| D109 | Support | | out: not subject matter |
| D110 | Server Release Notes | | mg-upgrades; "What changed recently" above |

### Database Manual pages outside the sidebar

| # | Area | Pages | Went to |
|---|---|---|---|
| M1 | Geospatial Queries | GeoJSON, 2dsphere, `$near`, `$geoWithin` | mg-geo |
| M2 | Text Search (self-managed) | `$text`, text indexes, languages | mg-text-index |
| M3 | Storage | WiredTiger, journaling, in-memory engine; GridFS | mg-storage, mg-self-host, mg-gridfs |
| M4 | Security | Authentication: SCRAM, x.509, LDAP, Kerberos, OIDC, localhost exception | mg-auth (SCRAM, x.509); LDAP out: deprecated in 8.0; Kerberos and OIDC out: Enterprise and Atlas sign-in, outside every goal |
| M5 | Security | Role-based access control, built-in and user-defined roles, collection-level access | mg-auth |
| M6 | Security | TLS/SSL | mg-tls |
| M7 | Security | Encryption at rest | mg-encryption |
| M8 | Security | Network and configuration hardening, IP binding | mg-network |
| M9 | Security | Auditing | out: Enterprise and Atlas dedicated tiers only |
| M10 | Server-side JavaScript | `$where`, `$function`, `$accumulator` (un-deprecated in 9.0); the FAQ's "How does MongoDB address SQL or Query injection?" | mg-injection, mg-expressions (`$function` only when nothing else works) |
| M11 | Map-Reduce | map-reduce and its examples | out: **deprecated since 5.0**; the pipeline replaces it (mg-pipeline) |
| M12 | Administration | Install Community on Linux, macOS, Windows, Docker; run as a service | mg-local |
| M13 | Administration | Backup methods; back up and restore with the tools; snapshots | mg-backup, mg-tools |
| M14 | Administration | Monitoring; full-time diagnostic data capture | mg-monitoring |
| M15 | Administration | Production notes; operations checklist | mg-self-host |
| M16 | Administration | Upgrade tutorials; feature compatibility version | mg-upgrades |
| M17 | Troubleshooting (8 pages) | connection storms, frequent elections, no primary, replication lag, server selection timeout, slow queries, backup failures, stuck chunk migrations | mg-conn-trouble, mg-elections, mg-monitoring, mg-slow-queries, mg-backup, mg-balancer |
| M18 | FAQ (7 pages) | concurrency, diagnostics, fundamentals, indexes, replication, sharding, storage | mg-atomic-doc, mg-monitoring, mg-what, mg-index-why, mg-rs-what, mg-shard-when, mg-self-host |
| M19 | Tutorials: modelling | one-to-one, one-to-many (embedded and references), many-to-many, trees, money, IoT, keyword search, atomic operations | mg-relations, mg-embed-ref, mg-trees, mg-bson-types, mg-time-series, mg-text-index, mg-atomic-doc |
| M20 | Tutorials: reading | query an array, embedded documents, an array of embedded documents, null or missing fields, project fields, iterate a cursor | mg-arrays-query, mg-nested, mg-null-exists, mg-projection, mg-cursors |
| M21 | Tutorials: updating | positional operators on arrays; updates with an aggregation pipeline | mg-positional, mg-update-pipeline |
| M22 | Tutorials: performance | TTL, ESR, analyse query performance, explain results, find and monitor slow queries, operation rejection filters | mg-ttl, mg-compound, mg-explain, mg-slow-queries; rejection filters out: an 8.0 administrator's tool |
| M23 | Collation | locales, case-insensitive comparison | mg-regex |
| M24 | Retryable reads and writes | | mg-app-retries |
| M25 | Read preference | modes, tags, `maxStalenessSeconds` | mg-read-pref |
| M26 | Stable API | | mg-upgrades |
| M27 | Database Profiler | | mg-slow-queries |
| M28 | Bulk Write Operations | `bulkWrite`; 8.0's cross-collection command | mg-bulk |
| M29 | Query engine | query optimisation (covered queries), query plans, plan cache, query shapes and settings, slot-based engine, 8.3's cost-based ranker | mg-covered, mg-query-settings |
| M30 | 9.0 changes | `constraint` validation, `mongocryptd` deprecated, per-query memory limit, open-transaction limit | mg-validation, mg-encryption, mg-agg-limits, mg-tx-when |

### Docs portal: Get Started, Management, Tools, other products

| # | Area | Item | Went to |
|---|---|---|---|
| G1 | Get Started | Quick Start | mg-atlas, mg-mongosh |
| G2 | Get Started | Build with AI | out: AI application tutorials; the database side is mg-vector |
| G3 | Get Started | Java + Spring Data | out: Java not chosen (owner) |
| G4 | Get Started | Node.js + Express.js | mg-node-connect, mg-app-client |
| G5 | Get Started | Python + FastAPI | out: Python not chosen (owner) |
| G6 | Management | Database Editions | mg-editions |
| G7 | Management | Atlas Users | mg-auth |
| G8 | Management | Clusters | mg-atlas-tiers |
| G9 | Management | Backup, Restore, and Archive | mg-backup |
| G10 | Management | Migrate or Import Data | mg-tools |
| G11 | Management | Monitor Clusters | mg-monitoring |
| G12 | Management | Manage Billing | out: account administration |
| G13 | Management | Explore Your Data (Data Explorer) | mg-compass |
| G14 | Management | Production Notes (Atlas) | mg-atlas-tiers |
| G15 | Management | Kubernetes Operator, Terraform, CloudFormation, Atlas for Government, Ops Manager, Cloud Manager | out: infrastructure tooling and enterprise products |
| G16 | Management | Migrate to Flex Clusters | mg-atlas-tiers |
| G17 | Tools | mongosh | mg-mongosh |
| G18 | Tools | Compass | mg-compass |
| G19 | Tools | Database Tools (`mongodump`, `mongorestore`, `mongoimport`, `mongoexport`) | mg-tools, mg-backup |
| G20 | Tools | Atlas CLI (`atlas local`) | mg-local, mg-search-local |
| G21 | Tools | Relational Migrator, `mongosync` | out: migration products; mg-vs-sql covers the thinking |
| G22 | Tools | VS Code extension, IntelliJ plugin, MCP Server | out: editor preferences, not subject matter |
| G23 | Connectors | Kafka, Spark, SQL interface | out: integrations outside every goal |
| G24 | Streaming | Atlas Stream Processing, Atlas Triggers | out: Atlas products outside every goal; mg-watch is the database's own mechanism |
| G25 | AI | Voyage AI models, AI integrations, AI agents | out, except embeddings, named in mg-vector |

### Node.js driver docs (7.x)

| # | Section | Pages | Went to |
|---|---|---|---|
| N1 | Overview, Get Started | | mg-node-connect |
| N2 | Connect | Create a MongoClient, Connection Options, Choose a Connection Target | mg-node-connect, mg-app-client |
| N3 | Connect | Connection Troubleshooting | mg-conn-trouble |
| N4 | Connect | Multiple Connections Tutorial | mg-app-client |
| N5 | Databases & Collections | | mg-node-crud |
| N6 | CRUD | Insert, Update, Delete | mg-node-crud |
| N7 | CRUD | Bulk Write Operations; Compound Operations | mg-bulk, mg-find-modify |
| N8 | CRUD | Transactions; Configure CRUD Operations | mg-transactions, mg-write-concern |
| N9 | CRUD | Generate Custom _id Values; Store Large Files | mg-id, mg-gridfs |
| N10 | Promises; Aggregation (Pipeline Stages); reading results | | mg-node-crud, mg-node-cursor |
| N11 | Data Formats | BSON, Undefined Values, UTF-8 Validation, Extended JSON, Time Series Data | mg-node-objectid, mg-bson-types, mg-ejson, mg-time-series; UTF-8 validation out: a driver setting |
| N12 | Indexes; Run a Database Command; Search; Vector Search | | mg-single-index, mg-atlas-search, mg-vector; database commands out: rarely needed from app code |
| N13 | Security; Monitoring and Logging; Change Streams | auth mechanisms, In-Use Encryption, TLS, SOCKS proxy; monitoring events, logging | mg-auth, mg-encryption, mg-tls, mg-watch; driver monitoring events and SOCKS out: driver diagnostics |
| N14 | TypeScript; Reference (release notes, upgrade guides) | | mg-node-ts, mg-upgrades, mg-node-connect (old options) |
| N15 | Third-Party Integrations | Integrate with Mongoose, Mongoose Get Started, Queryable Encryption with Mongoose, Prisma, Deploy on Vercel, Azure Functions | mg-mongoose-what, mg-mongoose-conn, mg-app-client, mg-network (Vercel); Prisma out: a second ODM, and the owner chose Mongoose; Mongoose with Queryable Encryption out: specialist |

### Go driver docs (v2.x)

| # | Section | Pages | Went to |
|---|---|---|---|
| GO1 | Overview, Get Started | | mg-go-connect |
| GO2 | Connect | Create a MongoClient, Choose a Connection Target, Specify Connection Options, Stable API, Connection Pools | mg-go-connect, mg-app-client, mg-upgrades (Stable API) |
| GO3 | Connect | Limit Server Execution Time (CSOT) | mg-go-context |
| GO4 | Connect | Compress Network Traffic, Customize Cluster Settings | out: tuning options outside every goal |
| GO5 | Connect | Connection Troubleshooting; AWS Lambda | mg-conn-trouble, mg-app-client |
| GO6 | Context Package | | mg-go-context |
| GO7 | Databases & Collections; CRUD (insert, query, update, delete, upsert, replace, count, distinct) | | mg-go-crud, mg-distinct |
| GO8 | CRUD | Access Data From a Cursor | mg-go-cursor |
| GO9 | CRUD | Bulk Operations, Compound Operations, Transactions, GridFS, Gin tutorial | mg-bulk, mg-find-modify, mg-transactions, mg-gridfs, mg-go-crud |
| GO10 | Aggregation | | mg-go-crud |
| GO11 | Data Formats | Work with BSON; Use Struct Tags | mg-go-bson, mg-go-tags |
| GO12 | Data Formats | Extended JSON; Geospatial Data | mg-ejson, mg-geo |
| GO13 | Indexes; Time Series; Search; Vector Search; Run a Database Command | | mg-single-index, mg-time-series, mg-atlas-search, mg-vector; database commands out |
| GO14 | Monitoring & Logging; Security | events, change streams, logging; auth mechanisms, TLS | mg-watch, mg-auth, mg-tls; events and logging out: driver diagnostics |
| GO15 | Third-Party Integrations; Reference (release notes, upgrade, quick reference) | | out (Bedrock tutorial); mg-upgrades, mg-go-connect (v1 to v2) |
| GO16 | v2 breaking changes | module path `/v2`; `primitive` merged into `bson` (`bson.ObjectID`); `mongo.Connect` takes no context; untyped decoding gives `bson.D`; `Distinct` returns a result; per-operation `MaxTime` removed for context deadlines or the client `Timeout` | mg-go-connect, mg-go-objectid, mg-go-bson, mg-go-context, mg-distinct |

### Mongoose guides (9.12)

| # | Guide | Went to |
|---|---|---|
| MG1 | Schemas, SchemaTypes | mg-mongoose-schema |
| MG2 | Connections | mg-mongoose-conn |
| MG3 | Models, Documents, Subdocuments | mg-mongoose-schema |
| MG4 | Queries, Query Casting, Faster Queries with Lean, findOneAndUpdate | mg-mongoose-queries |
| MG5 | Validation | mg-mongoose-validation |
| MG6 | Middleware | mg-middleware |
| MG7 | Populate | mg-populate |
| MG8 | Discriminators | out: an advanced feature; polymorphic data is in mg-patterns |
| MG9 | Plugins; Getters and Setters; Virtuals | mg-mongoose-schema (virtuals, `id`); plugins and getters out: conveniences |
| MG10 | Advanced: dates, custom casting, custom SchemaTypes, advanced schemas, sharing schemas | mg-bson-types (dates); the rest out |
| MG11 | Production: Indexes | mg-mongoose-schema (`autoIndex`) |
| MG12 | Integrations: Promises, Lodash, Lambda, Next.js, browser, GeoJSON, Transactions, deprecation warnings, Jest, TLS, CSFLE | mg-mongoose-conn (Lambda, Next.js), mg-transactions, mg-app-testing (Jest); the rest out |
| MG13 | TypeScript | mg-mongoose-ts |
| MG14 | Migration guides 5.x to 9.x | mg-middleware (no `next()`), mg-mongoose-queries (`returnDocument`) |

### Associate Developer exam objectives (scope only)

No goal or persona (owner, 15 Nov 2026); kept as MongoDB's own list of what a developer
must know, so the map is checked against it. Weights: document model 8%, CRUD 51%, indexes
17%, data modelling 4%, tools 2%, drivers 18%.

| # | Objective (paraphrased) | Went to |
|---|---|---|
| E1.1 | BSON types MongoDB supports | mg-bson-types |
| E1.2 | Differently shaped documents in one collection | mg-json |
| E2.1 | Well and badly formed inserts | mg-insert |
| E2.2 | Replacing a whole document | mg-replace |
| E2.3 | Updating with `$set` | mg-update |
| E2.4 | Upsert | mg-upsert |
| E2.5 | Updating many documents | mg-update |
| E2.6 | `findAndModify` with a concurrent operation | mg-find-modify |
| E2.7 | Deleting | mg-delete |
| E2.8 | Finding one document by equality | mg-find |
| E2.9 | Equality on an array field | mg-arrays-query |
| E2.10 | Comparison operators | mg-compare |
| E2.11 | `$in` | mg-compare |
| E2.12 | `$elemMatch` | mg-arrays-query |
| E2.13 | Logical operators | mg-compare |
| E2.14 | Sort and limit | mg-sort-limit |
| E2.15 | Projection | mg-projection |
| E2.16 | Getting every result from a cursor | mg-cursors |
| E2.17 | Counting | mg-count |
| E2.18 | Defining a search index | mg-search-index |
| E2.19 | A search query | mg-atlas-search |
| E2.20 | `$match` and `$group` | mg-group |
| E2.21 | `$lookup` | mg-lookup |
| E2.22 | `$out` | mg-out-merge |
| E3.1 | An index for a collection scan | mg-single-index |
| E3.2 | An index for equality on an array | mg-multikey |
| E3.3 | An index for a sort on two fields | mg-compound |
| E3.4 | Counting a collection's indexes | mg-single-index |
| E3.5 | Index trade-offs; dropping indexes | mg-index-cost |
| E3.6 | Explain output showing a problem | mg-explain |
| E4.1 | Embedded vs linked relationships | mg-embed-ref |
| E4.2 | Data model anti-patterns | mg-antipatterns |
| E5.1 | Sample dataset and Data Explorer | mg-sample-data, mg-compass |
| E6.1 | What a driver is | mg-app-client |
| E6.2 | How an app connects and uses the driver | mg-node-connect, mg-go-connect |
| E6.3 | Parts of a connection string | mg-conn-string |
| E6.4 | Connection pooling | mg-app-client |
| E6.5 | Insert one vs many in code | mg-node-crud, mg-go-crud |
| E6.6 | Update one vs many in code | mg-node-crud, mg-go-crud |
| E6.7 | Delete one vs many in code | mg-node-crud, mg-go-crud |
| E6.8 | Find one vs many in code | mg-node-crud, mg-go-crud |
| E6.9 | A pipeline in code | mg-node-crud, mg-go-crud |
| E6.10 | Query language vs pipeline syntax | mg-pipeline |

### MongoDB University

| # | Course or unit | Went to |
|---|---|---|
| C1 | Start Here: Intro to MongoDB (Node.js path, elective) | mg-what |
| C2 | Getting Started with MongoDB Atlas | mg-atlas, mg-what |
| C3 | MongoDB and the Document Model | mg-json, mg-bson-types, mg-schema-why |
| C4 | Connecting to a MongoDB Database Using the MongoDB Shell | mg-conn-string, mg-mongosh |
| C5 | Connecting to MongoDB in Node.js | mg-node-connect |
| C6 | CRUD Operations in MongoDB | mg-crud, mg-query, mg-results |
| C7 | MongoDB CRUD Operations in Node.js | mg-node-crud |
| C8 | Indexing Design Fundamentals | mg-indexes |
| C9 | MongoDB Aggregation | mg-agg |
| C10 | MongoDB Aggregation with Node.js | mg-node-crud |
| C11 | MongoDB Transactions (elective) | mg-tx |
| C12 | Introduction to Atlas Search (elective) | mg-search |
| C13 | Associate Developer exam (elective) | out: no exam goal (owner) |
| C14 | Intro to MongoDB: CRUD, Insert and Find | mg-insert, mg-find, mg-compare, mg-arrays-query |
| C15 | Intro to MongoDB: CRUD, Replace and Delete | mg-replace, mg-delete, mg-update, mg-upsert, mg-find-modify |
| C16 | Intro to MongoDB: CRUD, Modifying Query Results | mg-sort-limit, mg-projection, mg-count |
| C17 | Intro to MongoDB: Indexes (single, compound, multikey, delete) | mg-single-index, mg-compound, mg-multikey |
| C18 | Data Modeling Path: Relational to Document Model | mg-vs-sql, mg-relations, mg-validation |
| C19 | Data Modeling Path: Schema Design Patterns and Anti-patterns (inheritance, computed; unbounded arrays, bloated documents) | mg-patterns, mg-antipatterns |
| C20 | Data Modeling Path: Advanced Patterns and Anti-patterns (approximation, versioning, changes without downtime) | mg-patterns, mg-versioning |
| C21 | Data Modeling Path: Schema Design Optimization (single collection, bucket, sharded clusters) | mg-patterns, mg-shard-key |
| C22 | Data Modeling Path: Fundamentals of Data Transformation | mg-agg |
| C23 | Data Modeling Path: Indexing Design Fundamentals | mg-indexes |
| C24 | Data Modeling Path: Performance Tools and Techniques (profiling, slow queries, cache, hardware) | mg-slow-queries, mg-working-set |
| C25 | Data Modeling Path: CRUD Operations in MongoDB | as C6 |

### Other certifications (scope only)

| # | Exam | Went to |
|---|---|---|
| X1 | Associate Data Modeler (75 questions, 110 min) | its path (C18 to C24): mg-schema, mg-indexes, mg-perf |
| X2 | Associate DBA, self-managed (75 questions, 90 min) | its scope: mg-rs, mg-ops, mg-security, mg-sharding (all in "All of MongoDB") |
| X3 | Associate Atlas Administrator (70 questions, 95 min) | its scope: mg-atlas-tiers, mg-ops, mg-security, mg-network |

### Best-practice pages

| # | Page | Item | Went to |
|---|---|---|---|
| B1 | Anti-patterns | Unbounded arrays | mg-antipatterns, mg-relations |
| B2 | Anti-patterns | Too many collections | mg-antipatterns |
| B3 | Anti-patterns | Unnecessary indexes | mg-index-cost |
| B4 | Anti-patterns | Bloated documents | mg-antipatterns |
| B5 | Anti-patterns | Too many `$lookup` operations | mg-antipatterns, mg-lookup |
| B6 | Patterns | Computed values | mg-patterns |
| B7 | Patterns | Group data (bucket, outlier) | mg-patterns, mg-time-series |
| B8 | Patterns | Polymorphic data | mg-patterns |
| B9 | Patterns | Document and schema versioning | mg-versioning |
| B10 | Patterns | Archive | mg-patterns |
| B11 | Patterns | Single collection | mg-patterns |
| B12 | Development checklist | Durability: three voting members, `w: "majority"` | mg-write-concern, mg-rs-what |
| B13 | Development checklist | Schema: plan indexes, arrays under ~1,000 indexed elements, 16 MB, GridFS | mg-schema-why, mg-multikey, mg-limits, mg-gridfs |
| B14 | Development checklist | Replication: don't scale reads with secondaries | mg-read-pref |
| B15 | Development checklist | Sharding: an even shard key, targeted operations | mg-shard-key |
| B16 | Development checklist | Drivers: pooling, transient errors, retries with backoff, `maxTimeMS` | mg-app-client, mg-app-retries |
| B17 | Security checklist | Enable access control | mg-auth |
| B18 | Security checklist | Role-based access control, least privilege | mg-auth |
| B19 | Security checklist | Encrypt communication (TLS) | mg-tls |
| B20 | Security checklist | Encrypt and protect data | mg-encryption |
| B21 | Security checklist | Limit network exposure | mg-network |
| B22 | Security checklist | Audit system activity | out: see M9 |
| B23 | Security checklist | Run with a dedicated OS user | mg-self-host |
| B24 | Security checklist | Secure configuration (`--noscripting`) | mg-injection |
| B25 | Security checklist | Request a STIG | out: US Department of Defense deployments only |
| B26 | Security checklist | Security standards compliance | out: outside every goal |
| B27 | Operations checklist | Filesystem, hardware, Linux settings | mg-self-host |
| B28 | Operations checklist | Replication (odd voting members, hostnames, three data centres) | mg-rs-what, mg-self-host |
| B29 | Operations checklist | Backups: test restores on a schedule | mg-backup |
| B30 | Operations checklist | Monitoring: replication lag, oplog window, disk, queues | mg-monitoring |
| B31 | Indexing strategies; ESR guideline | | mg-compound, mg-index-cost |
| B32 | Production notes | | mg-self-host |

### Learner pain

Votes are each question's score; questions grouped by theme. Old-API questions (`mongo`
shell, `mgo`, driver v1, Mongoose callbacks) are counted for the pain they show, not for
their API.

| # | Problem | Votes (top questions) | Went to |
|---|---|---|---|
| P1 | "Like", contains a string, case-insensitive, "not like", regex speed | 1993, 765, 415, 131, 107, 83, 62 | mg-regex |
| P2 | Arrays: size greater than 1, not empty, contains a value, every element, last or nth element | 997, 807, 738, 347, 84, 52, 48, 42 | mg-arrays-query |
| P3 | Returning only the matched array element; filtering an array in a subdocument | 489, 138, 110, 42 | mg-projection, mg-expressions |
| P4 | Null, not null, missing, `$exists`, null vs no key | 714, 218, 161, 147, 70, 66 | mg-null-exists |
| P5 | Last N records, the latest record, sorting | 699, 250, 220, 217, 145, 28 | mg-sort-limit |
| P6 | Joins: SQL join equivalent, combining collections, `$lookup` on ids in an array, string vs ObjectId, nested and multi-condition lookups | 654, 320, 154, 112, 97, 81, 76, 52, 37, 32 | mg-lookup, mg-embed-ref |
| P7 | Embed or reference; one-to-many; referencing another schema | 642, 156, 68, Go 6 and 3 | mg-embed-ref, mg-relations |
| P8 | MongoDB vs Cassandra, CouchDB, Redis, MySQL, Lucene, Elasticsearch, Firebase | 762, 697, 530, 485, 465, 383, 286, 207, 180 | mg-when |
| P9 | Shell chores: list collections and databases, drop or rename a database, pretty print, more than 20 results, scripts, version | 947, 945, 609, 577, 505, 368, 322, 260 | mg-mongosh, mg-cursors |
| P10 | Dates: between two dates, ISODate, storing dates, time zones, by day or month | 570, 357, 242, 215, 206, 70, 58, 33 | mg-dates, mg-bson-types, mg-expressions |
| P11 | Updating a field from another field | 554 | mg-update-pipeline |
| P12 | `/data/db` missing, where data is stored, running as a service | 550, 232, 220, 207 | mg-local |
| P13 | Deleting everything, removing documents | 544, 350, 128, 86 | mg-delete |
| P14 | Upsert; insert if not exists; create or update and return it | 512, 197, 106, 78, 76, 51, Go 10 | mg-upsert, mg-find-modify |
| P15 | Adding, removing or renaming a field in every document | 500, 479, 306, 263, 166 | mg-field-ops |
| P16 | Export, import, dump, copy a collection, CSV | 482, 312, 250, 224, 220, 210, 110 | mg-tools |
| P17 | Securing with a password; "not authorized"; root user; bad auth; `@` in a password; Go SASL failures | 454, 338, 129, 123, 94, Go 89 | mg-auth, mg-conn-string |
| P18 | A random record | 453 | mg-stages (`$sample`) |
| P19 | Mongoose's `__v`, `_id` in subdocument arrays, `id` vs `_id`, timestamps | 452, 342, 256, 120, 117, 89 | mg-mongoose-schema |
| P20 | Mongoose `findOneAndUpdate` returning the old document | 439, 144, 106 | mg-mongoose-queries, mg-find-modify |
| P21 | Mongoose populate: nested, selected fields, after save, with aggregate | 206, 135, 120, 113, 103, 101, 89, 86 | mg-populate |
| P22 | Mongoose documents vs plain objects, `lean`, `exec`, can't modify the result | 291, 204, 109, 99 | mg-mongoose-queries |
| P23 | Mongoose collection names pluralised; model overwrite; schema not registered | 220, 178, 161, 128 | mg-mongoose-schema |
| P24 | Mongoose unique index not working; unique if not null | 165, 136, 88 | mg-mongoose-validation, mg-partial |
| P25 | ObjectId: find by id, compare with a string, convert, generate, duplicates across collections, "Cast to ObjectId failed" | 428, 316, 259, 226, 224, 214, 109, 102 | mg-id, mg-node-objectid |
| P26 | Go ObjectId: to string, from string, from insert result, zero ObjectId `000…` | Go 28, 19, 9, 8, 6 | mg-go-objectid, mg-go-tags |
| P27 | Projection: one field, excluding a field, mixing inclusion and exclusion, renaming | 417, 212, 90, 71, 44 | mg-projection |
| P28 | `E11000 duplicate key … dup key: { : null }`; skipping duplicates in `insertMany` | 377, Go 9, Go 6 | mg-unique, mg-app-errors, mg-node-errors, mg-go-errors |
| P29 | `GROUP BY` and count, group by several fields, distinct counts, sums | 369, 198, 178, 92, 73, 50, 42 | mg-group |
| P30 | Finding documents by a list of ids; does `$in` keep order | 366, 126 | mg-compare |
| P31 | Managing connections in a Node.js web app; closing; several databases; "Topology was destroyed" | 361, 197, 187, 177 | mg-app-client, mg-node-connect |
| P32 | Mongoose "buffering timed out after 10000ms" | 91 | mg-mongoose-conn |
| P33 | Pagination; total count with a limit; skip and limit in a pipeline | 334, 116, 90, 70, 50, Go 10 | mg-pagination, mg-facet |
| P34 | Arrays: push, remove an element, update objects in an array, update many array elements, nested arrays | 333, 250, 248, 225, 164, 131, 128, 76, 60 | mg-array-update, mg-positional |
| P35 | Integers stored as floats; strings to numbers; money | 280, 67, 32 | mg-bson-types |
| P36 | Old-driver warnings: `useNewUrlParser`, the SDAM engine, `ensureIndex`, `findAndModify`, mpromise, the C++ BSON extension | 282, 185, 165, 116, 95, 91 | mg-node-connect, mg-upgrades |
| P37 | Partial update that merges into a subdocument; `$set` on a nested value | 290, 60 | mg-field-ops (dot notation) |
| P38 | Querying nested objects and nested arrays | 307, 54, 46 | mg-nested, mg-arrays-query |
| P39 | Naming conventions | 307 | mg-schema-why |
| P40 | Images and file uploads | 227, 104 | mg-gridfs |
| P41 | Listening for changes | 231, Go 4, Go 3 | mg-watch |
| P42 | "couldn't connect to server 127.0.0.1:27017"; server selection timeout (Docker, Atlas) | 228, Go 15, Go 14, Go 3 | mg-conn-trouble |
| P43 | BSON vs JSON; Extended JSON | 222, Go 3 | mg-ejson |
| P44 | Versioning data | 337 | mg-versioning |
| P45 | Finding duplicate records | 248, 62, 36 | mg-group |
| P46 | Logging every query | 213, 124 | mg-slow-queries |
| P47 | Index choices: compound vs two single indexes, regex on an index, does `$group` use an index, Mongoose indexes in production | 150, 75, 62, 42 | mg-compound, mg-regex, mg-agg-limits, mg-mongoose-schema |
| P48 | Sort exceeded memory limit; `allowDiskUse` | 88, 49, 29 | mg-agg-limits |
| P49 | Pipeline errors: "must be an accumulator object", "exactly one field", "unknown top level operator", `$size` of a missing field, `$unwind` on empty arrays | 81, 58, 53, 43, 28 | mg-group, mg-stages, mg-unwind |
| P50 | Conditional sums and `$cond` | 89, 76, 46, 35, 32 | mg-expressions |
| P51 | Cursor not found; what a cursor is | 52, 48 | mg-cursors |
| P52 | Go: `bson.D` vs `bson.M`, structs to BSON, maps, custom types, mixed arrays | Go 20, 15, 13, 12, 10, 8 | mg-go-bson |
| P53 | Go: "composite literal uses unkeyed fields" (`bson.E`) | Go 95 | mg-go-bson |
| P54 | Go: struct tags needed?, `omitempty`, nulls, embedded structs, update only non-zero fields, `time.Time` | Go 28, 13, 7, 6, 5, 4 | mg-go-tags |
| P55 | Go: "no documents" checks, a record exists | Go 11, 9, 3 | mg-go-errors |
| P56 | Go: find all, `cursor.All`, millions of documents | Go 21, 9, 2 | mg-go-cursor |
| P57 | Go: reusing one client, pooling, moving from `mgo`, safe across goroutines, "context deadline exceeded" | Go 29, 16, 12, 11, 6, 2 | mg-app-client, mg-go-connect, mg-go-context |
| P58 | Go: transactions examples, the callback API, rollback | Go 15, 4, 3, 2 | mg-transactions |
| P59 | Go and Node: mocking MongoDB in tests | Go 7, 4 | mg-app-testing |
| P60 | Transactions failing locally; "No write concern mode named majority" | Go 10, 4 | mg-local-rs |
| P61 | Mongoose with TypeScript | 129 | mg-mongoose-ts |
| P63 | MongoDB vs Mongoose: what each is, which to use; why schemas and models; Mongoose without a schema or on an existing collection | 273, 174, 156, 113, 103 | mg-mongoose-what, mg-mongoose-schema |
| P62 | Not MongoDB: "large data" with pandas, Express's `ERR_HTTP_HEADERS_SENT`, passport.js, JavaScript OOP and async | 1190, 137, 124, 118, 112 | out: not about MongoDB (pandas is also Python, not chosen) |

**Gate (stage 3 and 5):** every row above has a destination or a reason; every exam
objective maps to a subtopic; counted, not eyeballed (376 rows, the table at the top); and the other way round, every subtopic in the plan has at least one row (checked by script), except `mg-app-secrets`, which comes from practice, not from a source page (see Decisions).

## Learners and goals

### Who studies MongoDB

Adapted from the blueprint's roster (§5). Prerequisite stated by the subject: **basic
JavaScript** (`mongosh` is a JavaScript shell) and **a small program written in Node.js
(22 or 24 LTS, with async/await) or Go (1.25+)**, the two languages the curriculum names (owner, 15 Nov 2026: "I will use Nodejs
and Golang"). A student who uses another language can follow everything but the two
driver big topics.

| | Persona | For MongoDB specifically |
|---|---|---|
| P1 | **Complete beginner** to databases | Knows a little JavaScript; has never used any database. Needs "what is a document, what is a collection" before any command, and a working database (free Atlas cluster or local) in the first hour. |
| P2 | **University student with a deadline** (Trellis's first users) | A backend-course project: an Express API with users, posts or orders, stored in MongoDB, often through Mongoose, shown in a demo. Needs to model the data, write the queries, and not leak the connection string. |
| P3 | **Builder shipping a first real app** | Same as P2 plus what makes it safe and fast in front of real users: indexes, validation, the right write concern, access control, backups, the free tier's limits. |
| P4 | **Coming from SQL** (the biggest neighbour; MySQL and PostgreSQL lead the 2025 survey) | Knows tables, joins, normalisation, `GROUP BY`, transactions. False friends: a collection is not a table with a fixed schema; joins become embedding or `$lookup`; `NULL` vs a missing field; no auto-increment id; transactions exist but are not the default way to stay consistent; `LIKE` becomes a regex or Search. |
| P4b | **Knows Mongoose but not MongoDB** (a large Trellis group: MERN tutorials teach Mongoose first) | Can write `Model.find()`; doesn't know what query it sends, why `populate` is slow, what `__v` is, why a unique index "doesn't work", or how to aggregate. |
| P5 | **Job seeker** | Interviews ask: embed or reference, indexes and the ESR rule, explain plans, the aggregation pipeline, ACID and transactions, replica sets and failover, sharding and shard keys, when not to use MongoDB. |
| P6 | ~~Certification candidate~~ **dropped** (owner, 15 Nov 2026: people preparing for an exam won't come to Trellis; the owner builds it first for his own study) | The exam's objectives stay in Coverage as MongoDB's own statement of scope, nothing more. |
| P6b | **Go backend developer** (the owner's second language) | Knows Go; wants the Go driver's idioms: `bson.D` and structs, struct tags, `context`, `bson.ObjectID`, `ErrNoDocuments`, cursors. Old answers online use `mgo` or driver v1 (`primitive.ObjectID`), which must not appear as current. |
| P7 | **Returning learner who knew an older MongoDB** | Remembers the `mongo` shell, callbacks, `count()`, map-reduce, `useNewUrlParser`, `result.value` from `findOneAndUpdate`, Mongoose callbacks and `next()`, M2/M5 and Serverless on Atlas, "no transactions". None of that may appear as current. |
| P8 | **Professional going deep** | Replica sets, read and write concern, sharding, performance tuning, change streams, security, backups, monitoring, Search and Vector Search. |
| P9 | **Very little time** | A weekend before a project is due. Needs core vs optional to be honest and the minutes believable. |
| P10 | **Non-native English speaker** | Many Trellis users. Plain names, no idioms. |

### Every goal a student could come with

| | Candidate goal | What "done" means |
|---|---|---|
| G1 | **Use MongoDB in a Node.js app** (the backend course project) | A Node.js API stores and reads its data in MongoDB through the official driver: a schema designed for its queries, CRUD and the common queries, the indexes those queries need, a simple aggregation or two, validation, transactions where they are needed, errors handled, a free Atlas cluster that only the app can reach. |
| G1b | **Use MongoDB in a Go app** | G1 with the Go driver (v2) instead of Node.js. |
| G2 | ~~Pass the Associate Developer exam~~ **dropped** (owner, 15 Nov 2026) | Not a goal and not walked; the objectives stay in Coverage as a scope check. |
| G3 | **All of MongoDB** | Everything a working MongoDB developer is expected to know, plus how it runs: replication, sharding, transactions, change streams, security, performance, backups, Search. |
| G4 | **Design schemas well** (the Data Modeler exam's scope) | Workload first, embed or reference, every relationship type, the schema patterns and anti-patterns, versioning, validation, indexing and performance tools. |
| G5 | **From SQL to MongoDB** | G1 for someone who knows SQL: what maps, what doesn't, and the habits to drop. (Trellis's "already know" claims, or a shortcut, may cover this; probably not a goal of its own.) |
| G6 | **Run MongoDB in production** | G1 plus replica sets, write and read concern, backups and restores, monitoring, slow queries, security hardening, upgrades. |
| G7 | **Get a backend job using MongoDB** | G1 plus aggregation in depth, indexes and explain, transactions, replication and sharding concepts. |
| G8 | **Just the basics** | Know what MongoDB is, get a database running, insert and find documents in `mongosh`. |
| G9 | **Search and AI features** | Atlas Search (`$search`, analyzers, autocomplete) and Vector Search (`$vectorSearch`, embeddings) on top of G1. |
| G10 | **Mongoose in a Node.js app** | G1 for a student whose project uses Mongoose: G1 plus the Mongoose big topic. |

**Shipped (owner, 15 Nov 2026): G1, G1b, G10 and G3**: "Use MongoDB in a Node.js app",
"Use MongoDB in a Go app", "Use Mongoose in a Node.js app" (added after review round 2),
"All of MongoDB". The owner's answers: three goals (the practical
one, the exam, the whole subject), then the languages "Nodejs and Golang specifically",
then, asked how to split the practical goal by language, "remove the exam thing
completely, I dont think people who will give exam, will come to trellis. before anyone I
am building this platform for myself, to keep track of my own studies, and I will use
Nodejs and Golang." Mongoose: its own big topic, outside the Node.js goal (see Decisions).
Every other candidate goal (G4 to G9) is walked in stage 8.

## The plan

**Revised after review rounds 1 and 2, 15 Nov 2026: 22 big topics, 143 subtopics (78
core).** (The stage-5 draft, 93 core, is commit `1ee1c37`; after round 1, 79 core, commit
`9631df5`.) In rough route order. **c** =
core, *o* = optional. "Needs" names the subtopics each one can't do without (the links the
file will write); "helped by" is a soft link. Big-topic links are worked out from the core
subtopics' links by `npm run subject` at stage 7; the paragraph after the goals is what
this list should give.

Items marked **(9.0)** need MongoDB 9.0. Atlas's Free tier ran **MongoDB 8.0** when checked
(15 Nov 2026); students can't upgrade it, but Atlas does after several patch releases, so
stage 10 re-reads that page. `atlas local` already runs 9.0. Items marked **(M10+)** need a
paid Atlas cluster.

### 1. What is MongoDB? (`mg-intro`)
The words every later topic uses.
- c `mg-what` **Documents and collections**: documents, collections, databases, and a database server that programs connect to. Needs nothing.
- *o* `mg-when` **When MongoDB fits**: when a document database is a good choice and when a relational one is; an interview topic, and nine of the most-voted "X vs MongoDB" questions. Needs mg-what.
- *o* `mg-vs-sql` **MongoDB for SQL users**: the word map (table and collection, row and document, `JOIN` and embedding or `$lookup`); each SQL trap sits in its own subtopic's mistakes. Helped by mg-what.
- *o* `mg-editions` **Atlas, Community, Enterprise**: where MongoDB runs and what each edition adds. Helped by mg-what.

### 2. Getting set up (`mg-setup`)
A database to work against in the first hour, and a shell to reach it.
- c `mg-atlas` **A free Atlas cluster**: the Free tier (runs 8.0, 512 MB, 500 connections, paused after 30 days with no connections, backups off until you turn them on), a database user, your IP address in the access list. Needs mg-what.
- *o* `mg-local` **MongoDB on your machine**: `atlas local` (a one-member replica set, with Search) or Community Server in Docker; why a plain standalone can't run transactions. Needs mg-what.
- c `mg-conn-string` **Connection strings**: `mongodb+srv://` and `mongodb://`, credentials (escaping `@`), the database name, options. Needs mg-what; helped by mg-atlas, mg-local.
- c `mg-mongosh` **mongosh**: installing it (or the one inside Compass); `show dbs`, `use`, `show collections`, running a script. Needs mg-conn-string.
- *o* `mg-compass` **Compass and Data Explorer**: looking at data in a GUI. Needs mg-conn-string.
- *o* `mg-conn-trouble` **When it won't connect**: `ECONNREFUSED 127.0.0.1:27017`, server selection timeouts, the access list, bad auth. Needs mg-conn-string.
- *o* `mg-sample-data` **Sample datasets**: loading `sample_mflix` and the other sample sets. Needs mg-atlas.
- *o* `mg-tools` **Importing your own data**: `mongoimport` and `mongoexport` for JSON and CSV, `mongodump` and `mongorestore`, copying a collection. Needs mg-conn-string.
- *o* `mg-atlas-tiers` **Atlas tiers and limits**: Free, Flex, Dedicated; Free's limits on operations, data transfer, sorts and pipelines; M2, M5 and Serverless are gone. Needs mg-atlas.

### 3. Documents and BSON (`mg-documents`)
What a document is made of, before writing one.
- c `mg-json` **Fields, values and nesting**: fields, values, nesting; documents in one collection can differ. Needs mg-what.
- c `mg-id` **_id and ObjectId**: every document's key, how an ObjectId is made, why it isn't a string, and why there is no auto-increment (an ObjectId sorts roughly by creation time). Needs mg-json.
- c `mg-bson-types` **BSON types that cause bugs**: int vs double vs Decimal128, dates as Date not strings, ObjectId; the deprecated `undefined`. Needs mg-json.
- c `mg-embedded` **Nested documents and arrays**: a document inside a document; arrays of values and of documents. Needs mg-json.
- *o* `mg-limits` **The 16 MB document limit**: and `.` and `$` in field names. Needs mg-embedded.
- *o* `mg-ejson` **BSON, JSON and Extended JSON**: what is stored vs what is shown; `$oid`, `$date`. Needs mg-bson-types.
- *o* `mg-gridfs` **Storing files**: GridFS, and files in object storage with a reference. Needs mg-limits.

### 4. CRUD basics (`mg-crud`)
Writing and reading documents in `mongosh`.
- c `mg-insert` **insertOne and insertMany**: and a seed script run with `mongosh` (`insert()` is deprecated). Needs mg-mongosh, mg-id.
- c `mg-find` **find and findOne**: equality filters; equality is case-sensitive. Needs mg-insert.
- c `mg-update` **updateOne and updateMany**: with `$set`; (`update()` and `save()` are the old ways). Needs mg-find.
- c `mg-upsert` **Upsert**: update or insert in one call. Needs mg-update.
- *o* `mg-replace` **replaceOne vs updateOne**. Needs mg-update.
- c `mg-delete` **deleteOne and deleteMany**: deleting a document doesn't delete the documents that point to it (`remove()` is the old way). Needs mg-find.
- c `mg-write-results` **What a write returns**: `insertedId`, `matchedCount` vs `modifiedCount`, `acknowledged`. Needs mg-update.

### 5. The Node.js driver (`mg-node`)
The official driver from Node.js: 7.8 or later (7.9 if you sign in with OIDC); Mongoose 9.12 installs 7.8. Every shell topic after CRUD basics carries over one to one.
- c `mg-node-connect` **Connecting from Node.js**: `MongoClient`, `connect`, `close`; options from old tutorials (`useNewUrlParser`, `useUnifiedTopology`) were removed in 7 and are now an error. Needs mg-conn-string; helped by mg-app-client.
- c `mg-node-crud` **CRUD from Node.js**: `insertOne`, `find(...).toArray()`, `updateOne`, `deleteOne`, `findOneAndUpdate` (returns the document itself since 6), all with `await`. Needs mg-node-connect, mg-update, mg-delete.
- c `mg-node-objectid` **ObjectId in Node.js code**: `new ObjectId(id)` and the error a bad id throws, `ObjectId.isValid`, comparing with `.equals`, sending ids as strings. Needs mg-node-crud.
- c `mg-node-errors` **Driver errors in Node.js**: `MongoServerError` and its `code` (11000), what to tell the user. Needs mg-node-crud; helped by mg-app-errors.
- *o* `mg-node-cursor` **Cursors in Node.js**: `for await`, closing, `await using`. Needs mg-node-crud.
- *o* `mg-node-ts` **TypeScript with the driver**: `Collection<T>`, `WithId`. Needs mg-node-crud.

### 6. The Go driver (`mg-go`)
The official driver (v2.10) from Go. Every shell topic after CRUD basics carries over one to one.
- c `mg-go-connect` **Connecting from Go**: `mongo.Connect(options.Client().ApplyURI(...))` with no context, `Disconnect`; the `/v2` module path. Needs mg-conn-string; helped by mg-app-client.
- c `mg-go-bson` **bson.D, bson.M and structs**: ordered vs unordered documents; untyped nested documents decode as `bson.D`; structs; `bson.E` and the unkeyed-fields warning. Needs mg-json.
- c `mg-go-tags` **Struct tags and omitempty**: `bson:"_id,omitempty"`, zero values, embedded structs (`inline`), `time.Time`; an `_id` decoded into a `string` field is an error in v2. Needs mg-go-bson.
- c `mg-go-crud` **CRUD from Go**: `InsertOne`, `Find` with `cursor.All`, `FindOne().Decode`, `UpdateOne` with `options.UpdateOne().SetUpsert(true)` (v2 split the option builders), `DeleteOne`. Needs mg-go-connect, mg-go-tags, mg-update, mg-delete.
- c `mg-go-objectid` **bson.ObjectID in Go code**: `Hex()`, `bson.ObjectIDFromHex`, the `InsertedID` type assertion (`primitive` is gone in v2). Needs mg-go-crud.
- *o* `mg-go-cursor` **Cursors in Go**: `Next` and `Decode` for large results, `Close`, `Err`. Needs mg-go-crud.
- c `mg-go-context` **Context and timeouts**: a deadline per call first; the client `Timeout` (marked experimental; with transactions it needs v2.10) and which one wins; v2 removed per-operation `MaxTime`. Needs mg-go-connect.
- c `mg-go-errors` **Driver errors in Go**: `mongo.ErrNoDocuments`, `mongo.IsDuplicateKeyError`, wrapping. Needs mg-go-crud; helped by mg-app-errors.

### 7. MongoDB in an app (`mg-app`)
What every driver asks of an app, whatever the language. Both app goals stand on it.
- c `mg-app-client` **One client for the whole app**: create once, share; the connection pool; serverless functions. Needs mg-conn-string.
- c `mg-app-secrets` **Credentials out of code**: environment variables; not committing the connection string; only your server talks to MongoDB, and a browser or phone app calls your API (Atlas's Data API and Device Sync have ended). Needs mg-conn-string.
- c `mg-app-errors` **Errors your app must handle**: duplicate key, validation failures, network errors; "not found" is not an error. Needs mg-app-client, mg-find; helped by mg-unique, mg-validation.
- *o* `mg-app-retries` **Retries and timeouts**: retryable writes and reads, short outages during failover; timeouts differ by driver (Node.js: `serverSelectionTimeoutMS`, `socketTimeoutMS`, `waitQueueTimeoutMS`, `maxTimeMS`, since `timeoutMS` does nothing from 7.8 and 6.22; Go: context deadlines). Needs mg-app-errors.
- *o* `mg-app-testing` **Testing with MongoDB**: a real test database vs fakes. Needs mg-app-client.

### 8. Mongoose (`mg-mongoose`)
The ODM most Node.js tutorials use. The target of its own goal, "Use Mongoose in a Node.js app" (owner, 15 Nov 2026).
- c `mg-mongoose-what` **Mongoose or the driver**: what an ODM adds, what it hides, and that it sends driver calls. Needs mg-app-client, mg-find; helped by mg-node-crud.
- c `mg-mongoose-conn` **Connecting with Mongoose**: `mongoose.connect`, buffering ("buffering timed out after 10000ms"); old options (`useCreateIndex`, `useFindAndModify`, `useNewUrlParser`) unsupported since 6. Needs mg-mongoose-what.
- c `mg-mongoose-schema` **Schemas and models**: SchemaTypes, the plural collection name, `_id` and `id`, `__v`, `timestamps`, subdocuments, `autoIndex` in production. Needs mg-mongoose-what, mg-bson-types.
- c `mg-mongoose-queries` **Queries, lean and exec**: documents vs plain objects, `.lean()`, `findOneAndUpdate` with `returnDocument`, casting and the `CastError` a bad id gives, `aggregate()` isn't cast, `strictQuery` and `sanitizeFilter`; methods removed in 7 and 8 (`remove`, `findOneAndRemove`, `count`). Needs mg-mongoose-schema; helped by mg-injection.
- c `mg-mongoose-validation` **Validation in Mongoose**: validators; they don't run on updates unless asked (`runValidators`); `unique` builds an index and is not a validator. Needs mg-mongoose-schema; helped by mg-unique.
- *o* `mg-populate` **populate**: references across collections, nested populate, its cost. Needs mg-mongoose-queries; helped by mg-embed-ref.
- *o* `mg-middleware` **Middleware and hooks**: `pre` and `post` hooks; no `next()` in Mongoose 9; which hooks `findOneAndUpdate` runs. Needs mg-mongoose-schema.
- *o* `mg-mongoose-ts` **Mongoose with TypeScript**: typed schemas and models (`QueryFilter` in 9). Needs mg-mongoose-schema.

### 9. Query filters (`mg-query`)
Asking for exactly the documents you want, safely.
- c `mg-compare` **Comparison operators**: `$gt`, `$in`, `$ne`, and the logical `$and`, `$or`, `$nor`, `$not`. Needs mg-find.
- c `mg-nested` **Querying nested fields**: dot notation; whole-document match vs field match. Needs mg-find, mg-embedded.
- c `mg-arrays-query` **Querying arrays**: contains a value, `$all`, `$size`, `$elemMatch`. Needs mg-compare, mg-embedded.
- c `mg-null-exists` **Null, missing and $exists**: `null` matches missing fields; since 8.0 it doesn't match the old BSON `undefined` type (not JavaScript's). Needs mg-compare.
- c `mg-regex` **Text patterns with $regex**: matching part of a string, and case-insensitive matching (SQL's `LIKE`; the most-voted MongoDB question, 1,993 votes). Needs mg-compare.
- c `mg-dates` **Dates and date ranges**: between two dates, "today", time zones. Needs mg-compare, mg-bson-types.
- c `mg-injection` **Untrusted input in filters**: request bodies that contain operators (`{ "$ne": null }`), `$where`; checking types, `$eq`, turning server-side JavaScript off. Needs mg-compare.

### 10. Sort, limit and fields (`mg-results`)
What comes back, in what order, how much.
- c `mg-projection` **Projection**: choosing fields; no mixing inclusion and exclusion; `$elemMatch`, `$slice` and the positional `"arr.$": 1` in a projection. Needs mg-arrays-query.
- c `mg-sort-limit` **Sort, limit and skip**: the latest N; sort order of mixed types. Needs mg-find.
- c `mg-pagination` **Pagination**: skip and limit vs ranges on a field (`_id` after the last one seen). Needs mg-sort-limit, mg-compare; helped by mg-index-why.
- c `mg-count` **Counting documents**: `countDocuments` vs `estimatedDocumentCount` (`count()` is deprecated). Needs mg-find.
- *o* `mg-cursors` **Cursors and batches**: why `mongosh` shows 20, iterating, cursor timeouts. Needs mg-find.
- *o* `mg-distinct` **Distinct values**. Needs mg-find.

### 11. Updating in depth (`mg-updates`)
Every change an app makes to documents already stored.
- c `mg-field-ops` **Field update operators**: `$inc`, `$unset`, `$rename`, `$min`/`$max`, `$currentDate`, `$setOnInsert`; one nested field with dot notation. Needs mg-update, mg-nested.
- c `mg-array-update` **Updating arrays**: `$push` with `$each`, `$addToSet`, `$pull`, `$pop`, and the positional `$` for the element the filter matched. Needs mg-update, mg-arrays-query.
- c `mg-find-modify` **findOneAndUpdate**: update and get the document back, before or after (`returnDocument`). Needs mg-update.
- *o* `mg-positional` **arrayFilters and $[]**: changing every or some elements, nested arrays. Needs mg-array-update.
- *o* `mg-bulk` **bulkWrite**: many mixed writes in one call, ordered or not. Needs mg-update.

### 12. Schema design (`mg-schema`)
A whole MongoDB exam (Data Modeler) and its learning path cover it; it is where real projects most often go wrong.
- c `mg-schema-why` **Design for your queries**: list the reads and writes first; naming. Needs mg-find.
- c `mg-embed-ref` **Embed or reference**. Needs mg-schema-why, mg-embedded.
- c `mg-relations` **One-to-many and many-to-many**: including one-to-many with no upper limit; no foreign keys. Needs mg-embed-ref.
- c `mg-duplication` **Duplicating data on purpose**: copying a few fields to save a lookup, and keeping the copies the same. Needs mg-relations; helped by mg-field-ops.
- c `mg-antipatterns` **Schema anti-patterns**: four of the docs' five (unbounded arrays, bloated documents, too many collections, too many `$lookup`s; unnecessary indexes are in mg-index-cost). Needs mg-relations; helped by mg-lookup.
- c `mg-validation` **Validating documents**: `$jsonSchema`; the levels (`strict`, `moderate`, and **(9.0)** `constraint`: every document must pass, and the rules can't change while it is on) and the actions. Needs mg-bson-types, mg-schema-why.
- *o* `mg-patterns` **Schema design patterns**: computed, bucket, subset, outlier, polymorphic, approximation, archive, single collection. Needs mg-relations.
- *o* `mg-versioning` **Changing a schema over time**: a version field; migrating gradually or at once. Needs mg-schema-why; helped by mg-validation.
- *o* `mg-trees` **Tree structures**: parent references, child references, ancestors, materialised paths. Needs mg-relations.
- *o* `mg-time-series` **Time series collections**: measurements over time, the built-in bucketing. Needs mg-bson-types, mg-schema-why.

### 13. Indexes (`mg-indexes`)
What makes a query fast or slow, and how to tell.
- c `mg-index-why` **How an index speeds a query**: collection scan vs index scan; every index slows writes; which text patterns and case-insensitive matches an index can serve (collation). Needs mg-find.
- c `mg-single-index` **Creating indexes**: `createIndex`, `getIndexes`, `dropIndex`; the same calls from Node.js (index options, then command options, since 7.8) and Go. Needs mg-index-why.
- c `mg-compound` **Compound indexes and ESR**: key order, the Equality-Sort-Range guideline, prefixes. Needs mg-single-index, mg-sort-limit, mg-compare.
- c `mg-explain` **Reading explain()**: `COLLSCAN` vs `IXSCAN`, documents examined vs returned, a `SORT` stage (no index served the sort). Needs mg-index-why.
- c `mg-unique` **Unique indexes**: duplicate key errors; only one document may lack the field (unlike SQL `UNIQUE`). Needs mg-single-index.
- *o* `mg-index-cost` **What indexes cost**: memory, unused and redundant indexes, `$indexStats`, hiding before dropping, building on a live collection. Needs mg-single-index.
- *o* `mg-multikey` **Indexes on arrays**: multikey indexes and their limits. Needs mg-single-index, mg-arrays-query.
- *o* `mg-ttl` **TTL indexes**: documents that delete themselves. Needs mg-single-index, mg-bson-types.
- *o* `mg-partial` **Partial and sparse indexes**: indexing some documents; "unique if not null". Needs mg-unique, mg-null-exists.
- *o* `mg-geo` **Geospatial queries**: GeoJSON points, the `2dsphere` index, `$near`, `$geoWithin`. Needs mg-single-index, mg-compare.

### 14. Aggregation (`mg-agg`)
Reports, groupings and joins: the pipeline.
- c `mg-pipeline` **The aggregation pipeline**: stages in order, documents flowing through; vs `find`; the same `aggregate` call from Node.js and Go. Needs mg-compare.
- c `mg-stages` **The everyday stages**: `$match`, `$project`, `$set`, `$sort`, `$limit`, `$skip`, `$sample`. Needs mg-pipeline, mg-sort-limit, mg-projection.
- c `mg-group` **$group and accumulators**: counts, sums, averages, `$push`; finding duplicates. Needs mg-stages.
- c `mg-lookup` **$lookup**: joining collections; sub-pipelines; matching ObjectId with string. Needs mg-stages; helped by mg-embed-ref.
- *o* `mg-unwind` **$unwind**: one document per array element. Needs mg-pipeline, mg-embedded.
- *o* `mg-expressions` **Expressions in a pipeline**: `$cond`, `$dateToString`, conversions (`$toString`, `$toObjectId`), `$filter`; `$function` only when nothing else works. Needs mg-stages.
- *o* `mg-facet` **Facets, buckets and windows**: `$facet` (a page and its total in one pass), `$bucket`, `$setWindowFields`. Needs mg-group.
- *o* `mg-out-merge` **$out, $merge and views**: saving results; standard and materialised views. Needs mg-pipeline.
- *o* `mg-agg-limits` **Pipeline order and memory**: `$match` first, 100 MB per stage, when stages spill to disk (`allowDiskUseByDefault`; ignored on Free; `$push` can't spill), **(9.0)** the per-query memory limit. Needs mg-group.
- *o* `mg-update-pipeline` **Updating with a pipeline**: setting a field from another field (554 votes); Mongoose 9 needs the `updatePipeline` option. Needs mg-stages, mg-update.

### 15. Transactions (`mg-tx`)
Keeping several writes consistent, starting with not needing a transaction.
- c `mg-atomic-doc` **One document: all or nothing**: one document's update is all or nothing. Needs mg-update, mg-embedded.
- c `mg-tx-when` **When you need a transaction**: and when embedding is better; the limits. Needs mg-atomic-doc, mg-embed-ref.
- *o* `mg-transactions` **Multi-document transactions**: sessions, `withTransaction`, commit and abort; passing the session to every operation (Node.js) or using the callback's context (Go); "only allowed on a replica set member". Needs mg-tx-when; helped by mg-local-rs.
- *o* `mg-tx-retry` **Retrying a transaction**: `TransientTransactionError`, `UnknownTransactionCommitResult`; **(9.0)** the open-transaction limit. Needs mg-transactions.

### 16. Security (`mg-security`)
Who can reach the data, and what they can do.
- c `mg-auth` **Users and roles**: how your app's database user signs in (SCRAM) and which built-in role to give it; one user per app. Needs mg-app-client.
- c `mg-network` **Network access**: the IP access list; a host with no fixed IP (Vercel, Render) needs "allow all", and then a strong password, a least-privilege user and TLS protect you; `bindIp`; private endpoints (paid tiers). Needs mg-conn-string.
- *o* `mg-tls` **TLS**: encrypted connections, and when you must set it up yourself. Needs mg-network.
- *o* `mg-encryption` **Encrypting sensitive fields**: at rest, Client-Side Field Level Encryption, Queryable Encryption (**(9.0)** `mongocryptd` deprecated). Needs mg-auth (the encryption keys live in a key vault that only chosen users can read).

### 17. Replica sets (`mg-rs`)
How MongoDB stays up: every Atlas cluster is one.
- c `mg-rs-what` **What a replica set is**: primary, secondaries, why three members. Needs mg-what.
- c `mg-elections` **Elections and failover**: what the app sees when the primary changes. Needs mg-rs-what.
- c `mg-write-concern` **Write concern**: `w: 1` vs `"majority"`, journaling, what "acknowledged" promises. Needs mg-rs-what, mg-insert.
- c `mg-read-pref` **Read preference**: primary, secondary, nearest; stale reads; why secondaries don't scale reads. Needs mg-rs-what.
- *o* `mg-read-concern` **Read concern**: `local`, `majority`, `snapshot`; causal consistency (read your own writes). Needs mg-write-concern.
- *o* `mg-oplog` **The oplog**: how secondaries copy the primary; the oplog window. Needs mg-rs-what.
- *o* `mg-rs-members` **Kinds of members**: arbiters (and why primary-secondary-arbiter is discouraged), priority, hidden and delayed members. Needs mg-elections.
- *o* `mg-local-rs` **A local replica set**: a one-member set, which local transactions and change streams need. Needs mg-rs-what, mg-local.

### 18. Change streams (`mg-streams`)
Reacting to changes as they happen.
- c `mg-watch` **Watching changes**: `watch()` on a collection, the event types. Needs mg-rs-what, mg-insert.
- c `mg-resume` **Resuming after a failure**: resume tokens; **(9.0)** the error after an election that hand-written loops and `mongosh` must handle. Needs mg-watch.
- *o* `mg-stream-filter` **Filtering change events**: a pipeline on `watch()`, full documents and pre-images. Needs mg-watch; helped by mg-stages.

### 19. Performance (`mg-perf`)
Finding and fixing what is slow.
- c `mg-slow-queries` **Finding slow queries**: `explain("executionStats")`, the profiler and slow-query log lines on your own server; on Atlas, the Query Profiler and Performance Advisor **(M10+)**. Needs mg-explain.
- c `mg-working-set` **Memory and the working set**: data and indexes that must fit in RAM. Needs mg-index-why.
- *o* `mg-covered` **Covered queries**: answered from the index alone. Needs mg-explain, mg-projection.
- *o* `mg-query-settings` **Query plans and settings**: the plan cache, `hint`, `setQuerySettings` (index filters are deprecated), 8.3's cost-based ranker, **(9.0, M10+)** `$queryStats` (marked unsupported by MongoDB). Needs mg-explain.
- *o* `mg-storage` **How MongoDB stores data**: WiredTiger, document-level concurrency, the journal, snapshots. Needs mg-working-set.

### 20. Operations (`mg-ops`)
Keeping a deployment healthy.
- c `mg-backup` **Backups and restores**: Atlas snapshots (on Free once you turn them on: daily, four kept), point-in-time restore on paid tiers, `mongodump` for small data, testing a restore. Needs mg-atlas.
- c `mg-monitoring` **Monitoring a deployment**: Atlas metrics and alerts, replication lag, disk, connections. Needs mg-rs-what.
- *o* `mg-upgrades` **Versions and upgrades**: majors and minors, end-of-life dates, the Stable API, feature compatibility version. Needs mg-rs-what.
- *o* `mg-self-host` **Running your own server**: production notes, WiredTiger cache, the operations checklist. Needs mg-rs-what, mg-local.

### 21. Sharding (`mg-sharding`)
Spreading one collection across machines.
- c `mg-shard-arch` **How a sharded cluster works**: shards, `mongos`, config servers. Needs mg-rs-what.
- c `mg-shard-when` **When to shard**: and why most apps never need to. Needs mg-shard-arch.
- c `mg-shard-key` **Choosing a shard key**: cardinality, frequency, monotonic keys, targeted vs scatter-gather. Needs mg-shard-arch, mg-compound.
- c `mg-hashed-ranged` **Hashed or ranged sharding**. Needs mg-shard-key.
- *o* `mg-balancer` **Chunks and the balancer**: and removing a shard (8.3's draining commands replace `removeShard`). Needs mg-shard-arch.
- *o* `mg-reshard` **Changing a shard key**: resharding; moving and unsharding collections (8.0). Needs mg-shard-key.
- *o* `mg-zones` **Zones**: keeping data in chosen regions. Needs mg-balancer, mg-shard-key.

### 22. Search (`mg-search`)
Full-text and vector search on your data: "MongoDB Search", on Atlas and, since 30 Jun 2026, on Community Edition through `mongot` (its compatibility table lists server 8.3; 9.0 not yet; no native macOS or Windows build).
- c `mg-search-index` **Search indexes**: defining one; static vs dynamic mappings; analyzers; Free allows three. Needs mg-index-why.
- c `mg-atlas-search` **MongoDB Search basics**: `$search`, relevance, `$searchMeta`. Needs mg-search-index, mg-stages.
- *o* `mg-autocomplete` **Autocomplete and fuzzy match**. Needs mg-atlas-search.
- *o* `mg-vector` **Vector Search**: embeddings (or Automated Embedding on Atlas), `$vectorSearch`, hybrid search (`$rankFusion`; `$scoreFusion` needs 8.3). Needs mg-search-index.
- *o* `mg-text-index` **Text indexes and $text**: the built-in text search, and its limits. Needs mg-single-index.
- *o* `mg-search-local` **Search on your own machine**: `atlas local` (it bundles Search, on 9.0), or the `mongo:8.3` image beside a `mongot` container on Linux. Needs mg-atlas-search, mg-local.

### Goals

| Goal | Targets | Why these |
|---|---|---|
| **Use MongoDB in a Node.js app** (`goal-mg-node`) | mg-node, mg-results, mg-updates, mg-schema, mg-indexes, mg-agg, mg-tx, mg-security | G1's "done": everything an API needs, safely, through the official driver. Not Mongoose, replica sets, operations, sharding, search. |
| **Use Mongoose in a Node.js app** (`goal-mg-mongoose`) | mg-mongoose and the same seven | G10: the same through Mongoose; the driver big topic is not required. |
| **Use MongoDB in a Go app** (`goal-mg-go`) | mg-go, mg-results, mg-updates, mg-schema, mg-indexes, mg-agg, mg-tx, mg-security | The same through the Go driver; no Mongoose. |
| **All of MongoDB** (`goal-mg-full`) | every big topic nothing else needs | G3. |

Counted from the list (by a script that copies `bigNeedsFrom` and the route order): the
Node.js goal requires **54** core subtopics, the Mongoose goal **55**, the Go goal **57**,
the whole subject **82**. (Round 1 cut the Node.js goal from 62; round 2 made Go's
cursors optional; the owner's fourth goal, 15 Nov 2026, made five Mongoose subtopics core.)
"Connecting from Node.js" (or from Go) is the **15th** topic on its goal's route, right
after CRUD basics; it was the 40th before round 2. Minutes come
in stage 7; check then that the Node.js goal lands near MongoDB's own Node.js path (its
required units are about 13 h) plus schema design and security, roughly 15 to 20 h.

**Big-topic links this list works out to** (checked by script; stage 7 confirms with
`npm run subject`): Getting set up and Documents need What is MongoDB?; CRUD basics needs
Getting set up and Documents; the Node.js driver, the Go driver, MongoDB in an app, Query
filters, Schema design and Replica sets need CRUD basics; Mongoose and Security need
MongoDB in an app; Sort, limit and fields and Updating in depth need Query filters;
Indexes and Aggregation need Sort, limit and fields; Transactions need Schema design;
Change streams and Operations need Replica sets; Performance needs Indexes; Sharding
needs Replica sets and Indexes; Search needs Aggregation and Indexes.

**Shape check:** 22 big topics; 3 to 10 subtopics each, each with at least one core; the
widest row in a frame is 6 (Indexes: six need "Creating indexes"); every subtopic has a
link; no core subtopic needs an optional one; no redundant link.

## Decisions

- **Subject id `mongodb`, prefix `mg-`** (stage 1). Short, lowercase, permanent; `mg-` is
  the prefix the blueprint reserved for it.
- **No exam goal, no certification persona** (owner, stage 4). The Associate Developer
  objectives stay in Coverage only as MongoDB's own statement of what a developer must
  know; nothing in the plan exists *because* of the exam.
- **Two languages, Node.js and Go** (owner, stage 4), each a big topic of its own, each the
  target of its own app goal. What every driver asks of an app (one client, secrets,
  errors, retries, testing) is written once, in "MongoDB in an app", which both stand on.
  The alternative, one app goal holding both drivers, would tell a Node.js student to learn
  Go. The cost: a driver idea that differs by language (ObjectId, cursors, errors,
  timeouts) appears twice, once per driver, with its own names.
- **Every other language left out** (Python, Java, C#, PHP, …). Their docs, the Get
  Started tutorials for Java and Python, and the pandas question are recorded as "out".
- **Each idea in the shell first, the driver right after CRUD basics** (corrected in round
  2, R1). MongoDB's Node.js path teaches the shell, then connecting from Node.js (its fifth
  unit), then CRUD in the shell and in Node.js, and so on, one concept at a time. Stage 5
  had read it as "all of the shell first", which put "Connecting from Node.js" 40th on the
  route. Now the drivers stand only on CRUD basics (their errors are *helped by* "Errors
  your app must handle"), so they come 15th; each driver topic says that the later shell
  topics carry over one to one. Hence "basic JavaScript" as a prerequisite even for the
  Go goal, and "async/await and Promises" for the Node.js one.
- **Security comes after "MongoDB in an app"** (round 2, R1 and R3): a database user is
  the app's user, and network access is a deploy-time question; before, a beginner went
  from `deleteMany` straight to SCRAM and roles.
- **Go's cursors are optional** (round 2, R1): `cursor.All` is Go's `toArray`, and closes
  the cursor itself; it sits in "CRUD from Go". Node.js and Go now get the same rule.
- **The minimum Node.js driver is 7.8** (round 2, R1 and R2): Mongoose 9.12 pins `~7.8`,
  and 7.8 holds the two fixes that matter to an app with a password; 7.9's fix is for OIDC.
  Mongoose 8 pins driver 6.20, before the `timeoutMS` fix, so the plan names Mongoose 9.
- **Mongoose has its own goal** (owner, 15 Nov 2026, after round 2's R1.2): "Use Mongoose
  in a Node.js app", a written exception to the blueprint's two or three goals. Stage 5 left
  Mongoose out of the Node.js goal; round 1 put it in with one core subtopic; round 2 showed
  that still told a Mongoose student "Can skip" for the topics their project is built from.
  Now its connection, schemas, queries and validation are core, and the Node.js driver big
  topic is not required by the Mongoose goal. Mongoose stands on "MongoDB in an app", not on
  the driver; "CRUD from Node.js" helps it. One trade-off is kept on purpose: the Mongoose
  goal still requires `$jsonSchema` validation (`mg-validation`), because Mongoose's
  validation runs in the app and anything else that writes to the collection skips it.
- **9.0 features are marked (9.0)** in the plan (round 1, R2; reworded in round 2): Atlas's
  Free tier ran 8.0 when checked, students can't upgrade it, and Atlas upgrades it on its
  own schedule; it is where Trellis's students start. Core content stays true on 8.0.
  Atlas tools that need a paid cluster are marked (M10+).
- **Round 1 made seven core subtopics optional** to keep the app goals honest (R1: 62 of
  93 core was "nearly everything"): `mg-when`, `mg-conn-trouble` (reactive: the stuck
  flow brings a student there), `mg-positional` (the matched-element `$` moved into
  `mg-array-update`), `mg-index-cost` ("indexes slow writes" moved into `mg-index-why`),
  `mg-transactions` (MongoDB: transactions are no replacement for schema design; the
  judgement, `mg-tx-when`, stays core), `mg-node-cursor` (`toArray` is enough for an API;
  Go's cursors stay core because `Find` always returns one) and `mg-unwind`. One core
  subtopic was folded (`mg-nested-update` into `mg-field-ops`). The Node.js goal went from
  62 core to 55, Go from 65 to 58.
- **Updating in depth is its own big topic** apart from CRUD basics: array updates and the
  positional operators are among the most-voted questions (P34), and CRUD basics would
  otherwise pass 10 subtopics.
- **Querying is split in two** (filters; "Sort, limit and fields"): 12 subtopics in one
  frame broke the 10 limit, and the halves have different jobs (which documents, what
  comes back). The second half was "Shaping results" until round 1 (R1: opaque).
- **"LIKE queries with $regex" is core**: the most-voted MongoDB question on Stack
  Overflow (1,993 votes) and the first search box any app gets.
- **"Untrusted input in filters" is core, in Query filters** (moved from Security in round
  1, R3): at the query, where the mistake is made; and in Security it made users and
  network access wait on every query topic. Sources: OWASP's NoSQL injection guide and
  MongoDB's FAQ (which covers only server-side JavaScript, un-deprecated in 9.0).
- **Schema validation is core in Schema design**: production practice for a database with
  a flexible schema. With Mongoose, its own validation does the job.
- **Write concern and read preference live in Replica sets**, not Transactions: each one
  only makes sense once "majority" and "secondary" mean something. Neither is in the app
  goals; Atlas's defaults (`w: "majority"`, primary reads) are right for a first app.
- **Backups are not in the app goals** (R2 asked for them; rejected in part): G1's "done"
  is an app that works, not a deployment kept for years. `mg-atlas` now says backups are
  off until turned on, so the student knows the switch exists.
- **Import and Atlas's tiers moved to Getting set up** (round 1, R3, R1): a student seeds
  data on day one; in Operations they waited on replica sets.
- **Geospatial moved to Indexes** (round 1, R3): `$near` can't run without a geospatial
  index. **Updating with a pipeline moved to Aggregation** (R3): it is pipeline syntax.
- **Change streams are a small big topic** (three subtopics) rather than a part of Replica
  sets: they are an app feature, not an operations one.
- **Time series is a subtopic of Schema design**: for a student, the built-in version of
  the bucket pattern.
- **Search: "MongoDB Search", index first** (round 1, R2 and R3). The product was renamed
  and went GA on Community Edition on 30 Jun 2026; its self-managed compatibility table
  lists 8.3, not yet 9.0. A search query can't run without a search index, so the index
  comes first. The id `mg-atlas-search` stays (ids are permanent; only the name changes);
  "atlas search" stays a keyword. Text indexes and `$text` sit beside it, optional.
- **"Credentials out of code" is core with no source page behind it**: it comes from
  practice (connection strings committed to GitHub). Kept; no reviewer objected.
- **SQL traps go in their home subtopics' mistakes** (round 1, R3), not only in the
  optional `mg-vs-sql`: no cascading deletes (`mg-delete`, `mg-relations`), one missing
  value per unique index (`mg-unique`), case-sensitive equality (`mg-find`, `mg-regex`),
  `NULL` vs missing (`mg-null-exists`). The stuck ranking matches a SQL student's own
  words against them.
- **Left out on purpose** (each also in Coverage, with its reason): map-reduce
  (deprecated), LDAP (deprecated), capped and clustered collections, wildcard indexes,
  auditing and Kerberos (Enterprise), Data Federation, Charts, Stream Processing and
  Triggers, connectors, Kubernetes and Terraform tooling, the AI tutorials, migrators,
  Prisma.

## Review log

### Round 1 (plan stage, 15 Nov 2026)

Three fresh reviewers in parallel (blueprint §5): **R1 Students** (P1, P2, P9, P10), **R2
Practitioner** (E1, P3, P5, P7, P8, P6b Go), **R3 Teacher and auditor** (E2, E3, E4, P4,
P4b). **58 findings: 10 must, 37 should, 11 could. Accepted 53 (all 10 musts), accepted in
part 5 (R1.4, R1.15, R2.5, R2.14, R2.19; within them two items rejected and one
deferred, each with its reason).** Every "must" and every version claim was re-checked by
the session on the primary page before it was accepted (Atlas's Free limits, the Vercel
guide, the Node.js 7 upgrade guide and 7.8.0 notes, the Search GA notice and
compatibility table, the transactions page).

**R1 Students** (18)

| # | Sev | Finding | Decision |
|---|---|---|---|
| R1.1 | must | Mongoose all "Can skip" in the Node.js goal misleads Mongoose students | **Accepted, another way**: Mongoose is targeted by the Node.js goal with one core subtopic (the choice); no fourth goal |
| R1.2 | must | "No backups on Free" is wrong; Free is paused after 30 days | **Accepted** (verified): mg-atlas, mg-backup, What changed |
| R1.3 | must | "Never `0.0.0.0/0`" blocks students on hosts with no fixed IP; private endpoints aren't on Free | **Accepted** (verified): mg-network rewritten |
| R1.4 | should | The app goal needs 62 of 93 core: too much | **Accepted**: cut to 55 (see Decisions); minutes come at stage 7 (**deferred** that part: minutes belong in the file, and `npm run subject` sums them) |
| R1.5 | should | Transactions API core; "when" comes after it | **Accepted**: mg-transactions optional, after mg-tx-when |
| R1.6 | should | arrayFilters and `$[]` core | **Accepted**: optional; the matched-element `$` moved into mg-array-update |
| R1.7 | should | What indexes cost core | **Accepted**: optional; one line moved to mg-index-why |
| R1.8 | should | When MongoDB fits core in the first hour | **Accepted**: optional |
| R1.9 | should | Mongoose through driver CRUD and errors | **Accepted**: mg-mongoose-what needs mg-app-client and mg-find; helped by mg-node-crud |
| R1.10 | should | First-hour assumptions: a server, an IP address, installing mongosh | **Accepted**: in mg-what, mg-atlas, mg-mongosh |
| R1.11 | should | async/await unnamed; Node cursors core | **Accepted**: prerequisite names it; mg-node-cursor optional |
| R1.12 | should | A bad id in the URL crashes Express | **Accepted**: mg-node-objectid |
| R1.13 | should | Idioms ("that bite", "and friends", "blips", "smuggle", …) | **Accepted**: all replaced |
| R1.14 | should | 16 names over 28 characters | **Accepted**: all renamed (checked by script) |
| R1.15 | could | "ESR", "Covered queries", "Shaping results" are jargon | **Accepted in part**: "Shaping results" renamed; **rejected** for ESR and covered queries: those are the words students search, and the summary says what they are |
| R1.16 | could | Updating nested fields is one rule, not a sitting | **Accepted**: folded into mg-field-ops |
| R1.17 | could | Mongoose 9's `returnDocument` and `updatePipeline` | **Accepted** (checked by R2 too) |
| R1.18 | could | No seeding path in the app goals | **Accepted**: mg-tools moved to Getting set up as "Importing your own data" |

**R2 Practitioner** (20)

| # | Sev | Finding | Decision |
|---|---|---|---|
| R2.1 | must | Free runs 8.0; 9.0 features taught as current | **Accepted** (verified): "(9.0)" marks, note in the plan and What changed |
| R2.2 | must | Backups on Free (as R1.2) | **Accepted** |
| R2.3 | must | Node.js `timeoutMS` is a no-op from 7.8 (CVE) | **Accepted** (verified): mg-app-retries per driver; What changed |
| R2.4 | must | `useNewUrlParser` removed in driver 7, now an error | **Accepted** (verified "removed" on the upgrade guide): mg-node-connect, What changed |
| R2.5 | should | Driver transaction bugs (`{ session }` in Node.js, the callback's ctx in Go) | **Accepted in part**: named in mg-transactions; no driver subtopics of their own (a core subtopic needing the now-optional mg-transactions would make it required again) |
| R2.6 | should | Local standalone can't run transactions | **Accepted**: mg-local and mg-transactions name it; mg-local-rs helps mg-transactions |
| R2.7 | should | "MongoDB Search" rename; self-managed table lists 8.3 only | **Accepted** (verified) |
| R2.8 | should | Two-argument `createIndex` deprecated in 7.8 | **Accepted**: in What changed and mg-node-crud |
| R2.9 | should | State a minimum safe Node.js driver | **Accepted**: 7.9 or later |
| R2.10 | should | `findOneAndUpdate` returns the document since 6 (`result.value` is gone) | **Accepted** (verified `includeResultMetadata` on the upgrade guide) |
| R2.11 | should | Go: nested `any` decodes as `bson.D`; `MaxTime` removed | **Accepted** |
| R2.12 | should | Go client `Timeout` is experimental; precedence | **Accepted** |
| R2.13 | should | A source for operator injection: OWASP | **Accepted**: source added, open question closed |
| R2.14 | should | Free's limits and backups unreachable from the app goals | **Accepted in part**: limits in core mg-atlas; tiers moved to Getting set up; backups stay in Operations (see Decisions) |
| R2.15 | should | The `constraint` level's rules collide with schema changes | **Accepted**: mg-validation says it freezes the rules; mg-versioning helped by mg-validation |
| R2.16 | could | `allowDiskUse` reads as pre-6.0 | **Accepted**: mg-agg-limits rewritten |
| R2.17 | could | Member kinds; production backups beyond `mongodump` | **Accepted**: optional mg-rs-members; mg-backup names snapshots and point-in-time restore |
| R2.18 | could | Storage engine and collation indexes for interviews | **Accepted**: optional mg-storage; collation in mg-regex |
| R2.19 | could | Legacy shell methods; Mongoose callbacks went in 7; `QueryFilter`; SERVER-89953 | **Accepted** except SERVER-89953 (**rejected**: a 9.0 known issue that will be fixed in a patch; not curriculum) |
| R2.20 | could | `removeShard`, `$queryStats`, `await using` unplaced | **Accepted**: mg-balancer, mg-slow-queries, mg-node-cursor |

**R3 Teacher and auditor** (20)

| # | Sev | Finding | Decision |
|---|---|---|---|
| R3.1 | must | The big-topic paragraph lists links the code would drop | **Accepted**: rewritten from a script that copies `bigNeedsFrom`; stage 7 confirms with `npm run subject` |
| R3.2 | must | Three redundant links | **Accepted**: removed (and one more the script found, mg-unwind → mg-arrays-query) |
| R3.3 | must | `$near` needs an index, but geospatial sat in Query filters | **Accepted**: moved to Indexes |
| R3.4 | should | Security waited on every query topic | **Accepted**: mg-injection moved to Query filters |
| R3.5 | should | Import and tiers waited on replica sets | **Accepted**: moved to Getting set up |
| R3.6 | should | Connection troubleshooting core held up CRUD | **Accepted**: optional |
| R3.7 | should | What a write returns needs an update | **Accepted** |
| R3.8 | should | Pagination needs `$gt`; projection's `$elemMatch` needs arrays | **Accepted**: "Sort, limit and fields" now needs Query filters |
| R3.9 | should | index-why → compare was chosen to satisfy a rule | **Accepted**: index-why needs mg-find; compound needs mg-compare; TTL needs mg-bson-types |
| R3.10 | should | Updating with a pipeline is pipeline syntax | **Accepted**: moved to Aggregation |
| R3.11 | should | Atomicity and "when to use a transaction" need embedding | **Accepted**: Transactions now needs Schema design |
| R3.12 | should | App topic abstract first; app-errors links to no CRUD | **Accepted** |
| R3.13 | should | Search query before its index; old name | **Accepted** |
| R3.14 | should | Anti-patterns "the docs' five" lists four | **Accepted** |
| R3.15 | should | Mongoose validation: runValidators; unique is an index | **Accepted** (as "helped by" mg-unique, since its subtopic is optional and Mongoose doesn't stand on Indexes) |
| R3.16 | should | SQL false friends belong in home subtopics | **Accepted** (see Decisions) |
| R3.17 | should | Injection source | **Accepted** (as R2.13). The Mongoose `sanitizeFilter` CVE numbers it named were not checked by the session, so they are not cited |
| R3.18 | should | No row for the Node.js driver's Third-Party Integrations | **Accepted**: N15 |
| R3.19 | could | conn-string and rs-what wrongly need Atlas | **Accepted** |
| R3.20 | could | Driver CRUD's `aggregate` needs no pipeline; shard-when before shard-arch | **Accepted**: helped by mg-pipeline; shard-arch first |

### Round 2 (plan stage, 15 Nov 2026)

The same three roles, fresh agents, told to check the rework and not to repeat decided
findings. **40 findings: 2 must, 17 should, 21 could. Accepted 37, accepted in part 1,
rejected 0, deferred to the owner 2** (R1.2 below, and R3.14, which depends on it).
The session re-checked R2's new facts on their pages (Mongoose 9.12.1 pins `mongodb
~7.8` on npm; Atlas upgrades Free clusters itself; `mongot` has no native macOS or
Windows build; the Go v2 option builders). Two claims could not be matched word for word
on their pages (the Performance Advisor's "M10+" and the Data API's end date); they are
kept in general words, without a date.

| # | Sev | Finding | Decision |
|---|---|---|---|
| R1.1 | must | Drivers 40th on the route; the Node.js path teaches the driver fifth, not after all of the shell | **Accepted**: drivers stand on CRUD basics only and come 15th; Decision rewritten |
| R1.2 | must | Mongoose students still told "Can skip" for the Mongoose topics they use, "Don't skip" for driver CRUD and `$jsonSchema` | **Deferred to the owner, who chose a fourth goal** (15 Nov 2026); `CastError` added to mg-mongoose-queries |
| R1.3 | should | "7.9 or later" impossible with Mongoose 9.12 (`~7.8`); 7.9's fix is OIDC only | **Accepted** (verified on npm) |
| R1.4 | should | Go cursors core while Node's are optional | **Accepted**: `cursor.All` into mg-go-crud; mg-go-cursor optional |
| R1.5 | should | "LIKE" and "cascading" and `undefined` are SQL and BSON words a beginner misreads | **Accepted**: "Text patterns with $regex"; summaries reworded |
| R1.6 | should | Regex and pagination name indexes long before Indexes | **Accepted**: index parts moved to mg-index-why; pagination helped by it |
| R1.7 | could | Total count in two sittings | **Accepted in part**: removed from mg-pagination; mg-count stays |
| R1.8 | could | SCRAM and roles in the first two hours | **Accepted**: Security after MongoDB in an app; summary reworded |
| R1.9 | could | "Freezes" is a metaphor | **Accepted** |
| R1.10 | could | Three "Documents…" names; "atomicity" | **Accepted**: "Fields, values and nesting"; "One document: all or nothing" |
| R1.11 | could | Check the goal's hours against MongoDB's path | **Accepted**: a stage-7 check (15 to 20 h) |
| R2.1 | should | Query Profiler, Performance Advisor and `$queryStats` need M10+ | **Accepted**: (M10+) marks; mg-slow-queries leads with explain and logs; `$queryStats` to mg-query-settings |
| R2.2 | should | Minimum driver vs Mongoose's pin (as R1.3) | **Accepted** |
| R2.3 | should | Atlas upgrades Free itself; `atlas local` runs 9.0 | **Accepted** (verified); stage 10 re-reads the Free page |
| R2.4 | should | Go v2: `_id` into a string field errors; split option builders | **Accepted** |
| R2.5 | should | `mongot` needs server 8.3, not on macOS or Windows | **Accepted** (verified) |
| R2.6 | should | Never put the connection string in a client app; Data API and Device Sync ended | **Accepted** |
| R2.7 | should | Mongoose 6, 7 and 8 changes that tutorials still show | **Accepted** |
| R2.8 | could | `waitQueueTimeoutMS`; 6.22 backport; one-argument `createIndex` | **Accepted** |
| R2.9 | could | Free allows three search indexes | **Accepted** |
| R2.10 | could | The blocking `SORT` stage in explain | **Accepted** |
| R2.11 | could | Node.js 20 is end of life | **Accepted**: 22 or 24 LTS |
| R2.12 | could | `mongosh` must also resume change streams | **Accepted** |
| R2.13 | could | Go client `Timeout` and transactions need v2.10 | **Accepted** |
| R2.14 | could | Automated Embedding; `$scoreFusion` needs 8.3 | **Accepted** |
| R3.1 | should | Updating arrays (positional `$`) needs Querying arrays | **Accepted** |
| R3.2 | should | The pipeline needs filters, not projection; stages need sort and projection | **Accepted** |
| R3.3 | should | Driver CRUD names `createIndex` and `aggregate` before they are taught | **Accepted**: moved into mg-single-index and mg-pipeline |
| R3.4 | should | Mongoose's `aggregate()` isn't cast | **Accepted** |
| R3.5 | should | A seed script needs insert, but sat in Getting set up | **Accepted**: moved into mg-insert |
| R3.6 | should | "No auto-increment" missing | **Accepted**: mg-id |
| R3.7 to R3.12 | could | autocomplete needs the query; zones need the shard key; go-bson needs no client; the encryption link's reason; partial needs `$exists`; three soft links | **Accepted** |
| R3.13 | could | Security too early | **Accepted** (as R1.8) |
| R3.14 | could | Mongoose skip reasons should be conditional | **Deferred** with R1.2 |
| R3.15 | could | Coverage nits (GO16, P3, P62 order) | **Accepted** |

**Stopping rule:** two rounds did not reach a round with no accepted "must" or "should",
so the blueprint (§5, "Stopping") says to stop and ask the owner, with the open
findings: R1.2 (and R3.14).

## Open questions

- **A fourth goal for Mongoose**: answered by the owner on 15 Nov 2026: yes
  ("Use Mongoose in a Node.js app"; see Decisions).
- **The Associate Developer objectives come from two public copies** of the study guide
  (the official one needs a sign-in). The owner accepted that (15 Nov 2026); they are a
  scope check only.
- **Is 55 core subtopics right for the Node.js goal** (57 for Go)? The hours come at
  stage 7 (target: roughly 15 to 20 h). If it is too big then, the next candidates to make
  optional are `mg-dates`, `mg-duplication` and `mg-write-results`.
