import bcrypt from "bcrypt";
import pool from "./index.js";

interface Turn {
  user: string;
  assistant: string;
}

interface ConversationSeed {
  title: string;
  turns: Turn[];
}

interface UserSeed {
  name: string;
  email: string;
  conversations: ConversationSeed[];
}

const SEED_USERS: UserSeed[] = [
  // User 1: Alice Chen
  {
    name: "Alice Chen",
    email: "alice@example.com",
    conversations: [
      {
        title: "Understanding Big-O Time Complexity",
        turns: [
          {
            user: "Can you explain what Big-O notation really means in simple terms?",
            assistant:
              "Big-O notation describes the upper bound of how an algorithm's execution time or memory requirements scale as the input size n increases. Instead of measuring seconds—which varies with hardware—it counts fundamental operations.",
          },
          {
            user: "What's the difference between O(n) and O(log n)?",
            assistant:
              "O(n) is linear: if input doubles, operations double (e.g. searching an unsorted array). O(log n) is logarithmic: each step cuts the search space in half (e.g. binary search). For 1,000,000 items, O(n) takes up to a million operations, whereas O(log n) takes only ~20!",
          },
          {
            user: "Why is quicksort usually preferred over mergesort if both are O(n log n)?",
            assistant:
              "Quicksort operates in-place with tiny constant factors and great CPU cache locality. Mergesort requires O(n) auxiliary memory allocation, though it guarantees worst-case O(n log n) and stability.",
          },
          {
            user: "How does space complexity factor into recursive calls?",
            assistant:
              "Each recursive invocation pushes a frame onto the call stack with local variables and return addresses. A recursion depth of d consumes O(d) auxiliary stack memory.",
          },
          {
            user: "Can tail call optimization eliminate that stack growth?",
            assistant:
              "Yes! When the recursive call is in tail position, a compiler supporting Tail Call Optimization (TCO) reuses the current stack frame instead of allocating a new one, reducing memory usage to O(1).",
          },
          {
            user: "That makes complete sense now. Thanks for breaking it down!",
            assistant:
              "You're very welcome! Let me know whenever you'd like to analyze any specific algorithms or code snippets.",
          },
        ],
      },
      {
        title: "PostgreSQL Indexing Strategies",
        turns: [
          {
            user: "When should I use a B-tree index vs a Hash index in PostgreSQL?",
            assistant:
              "B-tree is the default and most versatile index in Postgres. It supports equality (=) as well as range queries (<, <=, >, >=, BETWEEN). Hash indexes only optimize exact equality lookups.",
          },
          {
            user: "Does the column order matter in a composite index?",
            assistant:
              "Yes, column order matters tremendously! A composite index on (A, B) creates an index ordered by A first, then B. Queries filtering on A or (A, B) can leverage the index, but queries filtering solely on B cannot.",
          },
          {
            user: "What is a partial index and when should I use one?",
            assistant:
              "A partial index includes a WHERE clause, e.g. `CREATE INDEX ON orders (user_id) WHERE status = 'pending';`. This keeps the index small and fast when you only frequently query a subset of rows.",
          },
          {
            user: "How do I verify if Postgres is actually using my index?",
            assistant:
              "Run `EXPLAIN ANALYZE <your_query>;`. Look for 'Index Scan' or 'Bitmap Index Scan' instead of 'Seq Scan' (sequential full table scan).",
          },
          {
            user: "Why might Postgres choose a Seq Scan even with an index present?",
            assistant:
              "Common causes: the table is small (Seq Scan is faster than random index disk I/O), low selectivity (matching a large fraction of rows), outdated planner statistics (run ANALYZE), or wrapping indexed columns in functions like LOWER(email).",
          },
          {
            user: "So an expression index like LOWER(email) would fix that?",
            assistant:
              "Exactly! `CREATE INDEX ON users (LOWER(email));` enables direct index lookups for case-insensitive queries.",
          },
        ],
      },
      {
        title: "Docker Multi-stage Builds",
        turns: [
          {
            user: "Why should I use multi-stage builds in Docker for Node.js apps?",
            assistant:
              "Multi-stage builds separate build dependencies (TypeScript compiler, test frameworks, devDependencies) from runtime code. The final production image only includes compiled output and production dependencies, cutting image size by 70-80%.",
          },
          {
            user: "Could you show a minimal Dockerfile structure for TypeScript?",
            assistant:
              "Stage 1 (builder) copies package files, installs devDependencies, and runs `npm run build`. Stage 2 (runner) starts from clean node-alpine, installs only `--omit=dev` packages, copies `dist/` from builder, and executes `node dist/index.js`.",
          },
          {
            user: "Should I run the container as root or create a non-root user?",
            assistant:
              "Always switch to a non-root user (like `USER node` provided in official Node images). Running as root means any container breakout could compromise the host system.",
          },
          {
            user: "How does .dockerignore help with build caching?",
            assistant:
              "A `.dockerignore` file prevents directories like `node_modules`, `.git`, and local test outputs from entering the build context, accelerating uploads and keeping Docker cache hits reliable.",
          },
          {
            user: "What's the best way to handle environment variables securely?",
            assistant:
              "Never bake secret keys into image layers with ENV or ARG. Pass secrets at runtime via environment variables, Docker secrets, or cloud secret managers.",
          },
          {
            user: "Got it! That keeps the Docker pipeline clean and secure.",
            assistant:
              "Precisely. Smaller images also deploy faster and reduce your attack surface.",
          },
        ],
      },
      {
        title: "CSS Grid vs Flexbox",
        turns: [
          {
            user: "When should I reach for CSS Grid instead of Flexbox?",
            assistant:
              "Flexbox is one-dimensional (handles rows OR columns at a time). CSS Grid is two-dimensional (handles both rows AND columns simultaneously). Use Flexbox for linear components like navbars, and Grid for page layouts or card matrices.",
          },
          {
            user: "Can you create an auto-responsive card grid without media queries?",
            assistant:
              "Yes! Use: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));`. Cards wrap and expand to fill available space smoothly as the viewport resizes.",
          },
          {
            user: "What is gap support like across modern browsers?",
            assistant:
              "The `gap` property (row-gap and column-gap) is now fully supported across all modern browsers for both CSS Grid and Flexbox.",
          },
          {
            user: "How does the fr unit work in CSS Grid?",
            assistant:
              "The `fr` unit represents a fraction of free space after fixed tracks and gaps are computed. For example, `1fr 2fr` allocates 1/3 and 2/3 of available width.",
          },
          {
            user: "Super helpful, thanks!",
            assistant:
              "Anytime! CSS Grid makes complex responsive design much more intuitive.",
          },
        ],
      },
      {
        title: "Async/Await vs Promises",
        turns: [
          {
            user: "Is async/await just syntactic sugar over Promises in JavaScript?",
            assistant:
              "Yes, async/await is built on native Promises and generators. An async function always returns a Promise, and `await` pauses execution until that Promise settles.",
          },
          {
            user: "How should I handle multiple independent requests concurrently?",
            assistant:
              "Use `Promise.all([req1, req2])` or `Promise.allSettled()`. Avoid sequential `await req1; await req2;` which unnecessarily forces the second request to wait for the first.",
          },
          {
            user: "What's the difference between Promise.all and Promise.allSettled?",
            assistant:
              "`Promise.all` rejects immediately if any single promise fails (fail-fast). `Promise.allSettled` waits for every promise to complete and returns an array with each status (fulfilled or rejected).",
          },
          {
            user: "What happens if I forget a try/catch block around an await?",
            assistant:
              "If the awaited promise rejects without try/catch, it triggers an unhandled promise rejection, which will crash the Node.js process in modern versions.",
          },
        ],
      },
    ],
  },

  // User 2: Bob Martin
  {
    name: "Bob Martin",
    email: "bob@example.com",
    conversations: [
      {
        title: "REST API Design Best Practices",
        turns: [
          {
            user: "What are the core naming conventions for RESTful API endpoints?",
            assistant:
              "Use plural nouns for resource collections (e.g. `/users`, `/articles`), never verbs (avoid `/getUsers`). Use HTTP methods (GET, POST, PUT, PATCH, DELETE) to signify actions.",
          },
          {
            user: "What is the proper distinction between PUT and PATCH?",
            assistant:
              "`PUT` represents complete replacement of a resource: omitted fields are typically reset to defaults. `PATCH` applies partial updates, modifying only specified attributes.",
          },
          {
            user: "Which HTTP status code should I return when creating a resource?",
            assistant:
              "Return `201 Created` with the newly created resource in the body and a `Location` header pointing to its canonical URL.",
          },
          {
            user: "How should API errors be formatted for frontend clients?",
            assistant:
              "Return a consistent JSON schema, e.g. `{ error: { code: 'NOT_FOUND', message: 'Item does not exist' } }`, alongside appropriate HTTP status codes (400, 401, 403, 404, 500).",
          },
          {
            user: "Should API versioning go in the URL or in headers?",
            assistant:
              "URL versioning (`/api/v1/...`) is widely preferred for clarity and simple caching. Header versioning (`Accept: application/vnd.app.v1+json`) is purer REST, but harder to inspect and test via browser.",
          },
          {
            user: "Thanks! That aligns with standard industry practices.",
            assistant:
              "Glad to help! Consistency across your endpoints is the most important factor.",
          },
        ],
      },
      {
        title: "JWT Authentication Flow",
        turns: [
          {
            user: "Why do people recommend storing refresh tokens in httpOnly cookies instead of localStorage?",
            assistant:
              "`localStorage` is vulnerable to Cross-Site Scripting (XSS)—any malicious script injected on the page can steal tokens. An `httpOnly` cookie cannot be accessed by client-side JavaScript, mitigating XSS extraction.",
          },
          {
            user: "How does the token refresh flow work when an access token expires?",
            assistant:
              "When an API request returns 401, the client calls `/user/refresh` with the httpOnly cookie. The server validates the refresh token in the database, verifies expiry, and issues a fresh short-lived access token.",
          },
          {
            user: "What is refresh token rotation?",
            assistant:
              "With token rotation, every time a refresh token is used, the server revokes it and issues a brand-new refresh token. If an attacker attempts to reuse a spent token, the server revokes the entire session chain.",
          },
          {
            user: "What should the lifespan of access tokens vs refresh tokens be?",
            assistant:
              "A standard setup is 10-15 minutes for access tokens and 7-30 days for refresh tokens.",
          },
        ],
      },
      {
        title: "Database Normalization (1NF, 2NF, 3NF)",
        turns: [
          {
            user: "Can you briefly summarize 1NF, 2NF, and 3NF?",
            assistant:
              "1NF: Atomic values (no nested arrays) and unique primary key. 2NF: In 1NF and no partial key dependencies (every non-key attribute depends on the full composite key). 3NF: In 2NF and no transitive dependencies (non-key columns depend only on the primary key).",
          },
          {
            user: "When is deliberate denormalization acceptable?",
            assistant:
              "Denormalization is appropriate for read-heavy systems where expensive multi-table joins cause bottlenecks, such as analytical dashboards or pre-computing cached counters (e.g. `comment_count` on posts).",
          },
          {
            user: "What is the primary risk of denormalization?",
            assistant:
              "Data inconsistency anomalies! Writes and updates become more complicated because duplicated data must be updated across multiple tables.",
          },
          {
            user: "Makes total sense. Always normalize first until performance warrants it.",
            assistant:
              "Exactly right. Premature denormalization is the root of many subtle data bugs.",
          },
        ],
      },
      {
        title: "Git Branching: Trunk-Based vs GitFlow",
        turns: [
          {
            user: "What are the advantages of Trunk-Based Development over GitFlow?",
            assistant:
              "Trunk-Based Development has engineers merge short-lived branches frequently into a single `main` branch. This eliminates merge hell, accelerates continuous delivery, and catches conflicts early.",
          },
          {
            user: "How do teams safely deploy uncompleted features in Trunk-Based?",
            assistant:
              "They use Feature Flags (toggles). New code paths are merged and deployed to production behind dynamic toggles that remain turned off until the feature is verified.",
          },
          {
            user: "When is squash merging preferred over merge commits?",
            assistant:
              "Squash merging collapses iterative work-in-progress commits into a single cohesive commit on `main`, keeping the commit log clean, linear, and easy to revert if bugs occur.",
          },
        ],
      },
      {
        title: "Redis Caching Strategies",
        turns: [
          {
            user: "What is the Cache-Aside pattern?",
            assistant:
              "In Cache-Aside, the application first queries Redis. On a cache hit, it returns data immediately. On a miss, it fetches data from PostgreSQL, stores it in Redis with a TTL, and then returns it.",
          },
          {
            user: "How do you prevent a cache stampede / thundering herd?",
            assistant:
              "Use distributed mutex locks so only one request queries the database while others wait, or add jitter to TTL expirations so keys don't all expire at the exact same second.",
          },
          {
            user: "Which eviction policy should I choose for general web caching?",
            assistant:
              "`allkeys-lru` (Least Recently Used) or `volatile-lru` are the most popular choices, automatically evicting stale data when memory limits are reached.",
          },
        ],
      },
    ],
  },

  // User 3: Charlie Davis
  {
    name: "Charlie Davis",
    email: "charlie@example.com",
    conversations: [
      {
        title: "OS Concurrency: Mutex vs Semaphore",
        turns: [
          {
            user: "What is a race condition in multi-threaded programming?",
            assistant:
              "A race condition happens when multiple threads access and modify shared memory simultaneously without proper synchronization, making the final state depend unpredictably on execution timing.",
          },
          {
            user: "What is the difference between a Mutex and a Semaphore?",
            assistant:
              "A Mutex is an ownership lock: only the thread that locked it can unlock it. A Semaphore is a signaling counter: it tracks available resource units and allows up to N threads access concurrently.",
          },
          {
            user: "What are the 4 Coffman conditions for deadlocks?",
            assistant:
              "1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, and 4) Circular Wait. Breaking any one of these guarantees deadlock cannot occur.",
          },
          {
            user: "How does strict lock ordering prevent deadlocks?",
            assistant:
              "If all threads always acquire locks in the exact same global sequence (e.g. Lock A then Lock B), a circular dependency cycle is mathematically impossible.",
          },
          {
            user: "What is an atomic compare-and-swap (CAS)?",
            assistant:
              "CAS is a hardware instruction that compares the contents of a memory location to an expected value and swaps in a new value only if they match, enabling lock-free data structures.",
          },
          {
            user: "Clear and concise explanation, thank you!",
            assistant:
              "Anytime! Concurrency is subtle, but mastering the fundamentals makes debugging much simpler.",
          },
        ],
      },
      {
        title: "TCP 3-Way Handshake & Protocols",
        turns: [
          {
            user: "Can you explain the TCP 3-way handshake step by step?",
            assistant:
              "1) Client sends SYN with initial sequence number ISNc. 2) Server replies with SYN-ACK acknowledging ISNc and sending its own ISNs. 3) Client sends ACK confirming ISNs. A reliable connection is now open.",
          },
          {
            user: "Why don't real-time multiplayer games use TCP?",
            assistant:
              "TCP guarantees in-order delivery and retransmits lost packets (head-of-line blocking). In real-time games, a late position packet is useless; low latency and real-time freshness matter more than 100% packet delivery, so UDP is preferred.",
          },
          {
            user: "What is the role of congestion control in TCP?",
            assistant:
              "Algorithms like Cubic or BBR monitor latency and packet loss, dynamically adjusting transmission window size to maximize network bandwidth without overloading intermediate routers.",
          },
        ],
      },
      {
        title: "JavaScript Memory Leaks & WeakMap",
        turns: [
          {
            user: "How can memory leaks happen in JavaScript if it has garbage collection?",
            assistant:
              "JavaScript uses mark-and-sweep garbage collection. An object cannot be collected if it is reachable from root references (global scope, closures, active event handlers).",
          },
          {
            user: "What are the most frequent causes of memory leaks?",
            assistant:
              "Forgotten event listeners or `setInterval` timers, detached DOM tree nodes referenced in arrays, and closures capturing large enclosing scopes indefinitely.",
          },
          {
            user: "How does WeakMap help solve this?",
            assistant:
              "A `WeakMap` holds weak references to its object keys. If no other references exist to the key object, it can be garbage collected along with its associated value.",
          },
        ],
      },
      {
        title: "SQL Window Functions in Practice",
        turns: [
          {
            user: "What is the main benefit of SQL window functions?",
            assistant:
              "Window functions calculate aggregations across a sliding window of related rows without collapsing the result set into a single row like `GROUP BY` does.",
          },
          {
            user: "What is the difference between RANK() and DENSE_RANK()?",
            assistant:
              "When there are ties, `RANK()` skips ranks (e.g. 1, 2, 2, 4). `DENSE_RANK()` does not skip ranks (e.g. 1, 2, 2, 3).",
          },
          {
            user: "Can you show how to compute a running total?",
            assistant:
              "Use: `SELECT date, amount, SUM(amount) OVER (ORDER BY date) AS cumulative_sum FROM payments;`.",
          },
        ],
      },
      {
        title: "Clean Code & Refactoring Principles",
        turns: [
          {
            user: "What is the Single Responsibility Principle (SRP)?",
            assistant:
              "A class or module should have only one reason to change, separating disparate concerns like HTTP parsing, business logic, and database persistence into distinct units.",
          },
          {
            user: "What is the Boy Scout Rule in software development?",
            assistant:
              "'Always leave the codebase cleaner than you found it.' When working on a task, take 5 minutes to clean a messy variable name, remove unused imports, or extract a long helper.",
          },
          {
            user: "Great mindset for maintaining healthy codebases.",
            assistant:
              "Indeed! Small continuous refactorings prevent massive technical debt build-ups.",
          },
        ],
      },
    ],
  },

  // User 4: Diana Patel
  {
    name: "Diana Patel",
    email: "diana@example.com",
    conversations: [
      {
        title: "System Design: Layer 4 vs Layer 7 Load Balancing",
        turns: [
          {
            user: "What is the difference between Layer 4 and Layer 7 load balancers?",
            assistant:
              "Layer 4 load balancers route TCP/UDP packets based on IP and port without inspecting payload data. Layer 7 load balancers inspect application-layer HTTP headers, cookies, and URLs for smart content routing.",
          },
          {
            user: "Which algorithm works best when backend servers have unequal specs?",
            assistant:
              "Weighted Round Robin or Weighted Least Connections, where higher-spec servers receive a higher proportion of incoming requests.",
          },
          {
            user: "How do load balancers handle server health checks?",
            assistant:
              "They send recurring pings (e.g. `GET /health` every 5s). If a backend fails consecutive checks, it is taken out of rotation until it recovers.",
          },
          {
            user: "What is sticky sessions and what is the trade-off?",
            assistant:
              "Sticky sessions pin a user to a specific backend server via cookies. The drawback is uneven server load distribution and session disruption if that server restarts.",
          },
          {
            user: "Makes total sense. Layer 7 gives maximum flexibility.",
            assistant:
              "Exactly, especially for microservice path routing like `/api/v1/auth` vs `/api/v1/billing`.",
          },
        ],
      },
      {
        title: "Monolith vs Microservices Architecture",
        turns: [
          {
            user: "Why do senior architects often recommend starting with a modular monolith?",
            assistant:
              "A modular monolith has simple deployments, single-database ACID guarantees, and zero inter-service network latency. Microservices introduce distributed tracing, network failures, and eventual consistency challenges.",
          },
          {
            user: "When is extracting a microservice justified?",
            assistant:
              "When specific components have distinct scaling requirements (e.g. heavy image processing), different regulatory compliance boundaries, or independent release cycles for large isolated teams.",
          },
          {
            user: "What is the Saga pattern for distributed transactions?",
            assistant:
              "A Saga is a sequence of local transactions across microservices. If any transaction fails, compensating transactions are executed to undo earlier operations.",
          },
        ],
      },
      {
        title: "React Performance Optimization",
        turns: [
          {
            user: "When is useMemo or useCallback actually worth using?",
            assistant:
              "Use them for computationally heavy operations (e.g. filtering thousands of items) or when passing callbacks to memoized child components (`React.memo`) to avoid unwanted re-renders.",
          },
          {
            user: "Why should we avoid array indexes as React keys?",
            assistant:
              "Using array indexes causes UI bugs and lost state if items are reordered, inserted at the beginning, or deleted, because React cannot reliably identify which item moved.",
          },
          {
            user: "What are React Server Components (RSC)?",
            assistant:
              "RSC allows components to render strictly on the server and stream UI to the client without sending their dependent NPM libraries over the wire, shrinking client bundle sizes.",
          },
        ],
      },
      {
        title: "WebSockets vs Server-Sent Events (SSE)",
        turns: [
          {
            user: "When should I choose Server-Sent Events over WebSockets?",
            assistant:
              "Choose SSE when data flow is one-way from server to client (e.g. live AI token streaming, stock tickers). SSE runs over standard HTTP/2, handles auto-reconnects natively, and passes through firewalls easily.",
          },
          {
            user: "And WebSockets are best for two-way communication?",
            assistant:
              "Yes! WebSockets provide full-duplex, low-overhead communication over a persistent TCP connection, perfect for collaborative whiteboards, multiplayer games, and chat.",
          },
          {
            user: "That clarifies the trade-off nicely.",
            assistant:
              "Both have their place. SSE is simpler when you only need server-to-client streaming.",
          },
        ],
      },
      {
        title: "Data Structures: Prefix Trees (Tries)",
        turns: [
          {
            user: "What problem does a Trie solve better than a hash map?",
            assistant:
              "A Trie excels at prefix matching, autocomplete suggestions, and lexicographical ordering. While a hash map does exact lookups in O(L), it cannot find all words with a prefix without scanning every key.",
          },
          {
            user: "What is the time complexity of insert and search in a Trie?",
            assistant:
              "Both operations are O(L), where L is the length of the string, completely independent of how many total words N are in the dictionary.",
          },
          {
            user: "What is a Radix Tree / Patricia Trie?",
            assistant:
              "A space-optimized Trie where intermediate nodes with only one child are merged, compressing single-character chains and slashing memory overhead.",
          },
        ],
      },
    ],
  },

  // User 5: Evan Wilson
  {
    name: "Evan Wilson",
    email: "evan@example.com",
    conversations: [
      {
        title: "Machine Learning: Gradient Descent & Adam",
        turns: [
          {
            user: "How does gradient descent minimize a loss function?",
            assistant:
              "Gradient descent computes the gradient (vector of partial derivatives) of the loss function with respect to weights, then updates weights in the opposite direction: w = w - learning_rate * gradient.",
          },
          {
            user: "What happens if the learning rate is too high or too low?",
            assistant:
              "Too low: training is extremely slow and can get stuck in local plateaus. Too high: updates overshoot the optimal minima, oscillating wildly or diverging entirely.",
          },
          {
            user: "Why is the Adam optimizer so popular in deep learning?",
            assistant:
              "Adam combines momentum (smoothing noisy gradients) and RMSprop (adaptive per-parameter learning rates based on historical squared gradients), providing stable convergence with minimal tuning.",
          },
          {
            user: "What is the difference between batch and mini-batch gradient descent?",
            assistant:
              "Batch calculates gradients over the whole dataset (accurate but slow). Mini-batch computes over small batches (e.g. 32-256 samples), achieving great GPU utilization and faster convergence.",
          },
          {
            user: "Clear explanation! Thanks for the breakdown.",
            assistant:
              "You bet! Optimizer selection is key for efficient training.",
          },
        ],
      },
      {
        title: "Vector Embeddings & Cosine Similarity",
        turns: [
          {
            user: "What actually is a vector embedding in AI?",
            assistant:
              "A vector embedding is a dense array of numbers (e.g. 768 or 1536 floats) generated by an encoder model representing semantic meaning. Conceptually similar texts map close together in vector space.",
          },
          {
            user: "Why do vector search engines use Cosine Similarity instead of Euclidean distance?",
            assistant:
              "Cosine similarity evaluates the angle between vectors rather than vector magnitude: cos(theta) = (A . B) / (|A| * |B|). Documents of different lengths with identical meaning still score high.",
          },
          {
            user: "What is HNSW in vector databases like pgvector or Pinecone?",
            assistant:
              "HNSW (Hierarchical Navigable Small World) is a graph-based Approximate Nearest Neighbor (ANN) index algorithm providing logarithmic lookup speed over millions of high-dimensional vectors.",
          },
        ],
      },
      {
        title: "Web Security: SQL Injection & XSS",
        turns: [
          {
            user: "What is SQL Injection and how is it completely prevented?",
            assistant:
              "SQL Injection occurs when untrusted input is concatenated into SQL queries. It is completely prevented by using parameterized queries (prepared statements), where inputs are strictly treated as data rather than executable code.",
          },
          {
            user: "What is the difference between Stored XSS and Reflected XSS?",
            assistant:
              "Stored XSS persists the malicious script in the database (e.g. in comments), infecting anyone who views the page. Reflected XSS reflects the payload immediately from a URL parameter back to the victim.",
          },
          {
            user: "How do SameSite cookie attributes prevent CSRF?",
            assistant:
              "SameSite=Lax or Strict blocks browsers from sending cookies on cross-origin requests, stopping malicious third-party sites from executing unauthorized actions on behalf of authenticated users.",
          },
        ],
      },
      {
        title: "Kafka vs RabbitMQ Message Brokers",
        turns: [
          {
            user: "What is the core conceptual difference between RabbitMQ and Apache Kafka?",
            assistant:
              "RabbitMQ is a traditional message queue: messages are routed to queues and deleted once acknowledged. Kafka is a distributed append-only commit log: messages persist on disk for a retention window and can be replayed.",
          },
          {
            user: "How does Kafka achieve high horizontal scalability?",
            assistant:
              "Kafka topics are divided into partitions across a broker cluster. Consumers in a consumer group read separate partitions concurrently, distributing throughput.",
          },
          {
            user: "What happens if a Kafka consumer crashes?",
            assistant:
              "Kafka triggers a partition rebalance, reassigning the crashed consumer's partitions to remaining healthy consumers, which continue from the last committed offset.",
          },
        ],
      },
      {
        title: "Graph Algorithms: Dijkstra vs A* Search",
        turns: [
          {
            user: "How does A* search improve upon Dijkstra's algorithm?",
            assistant:
              "Dijkstra explores radially in all directions. A* adds a heuristic h(n) estimating the distance to the goal (f(n) = g(n) + h(n)), focusing search directly toward the target.",
          },
          {
            user: "What makes a heuristic 'admissible' in A*?",
            assistant:
              "A heuristic is admissible if it never overestimates the actual remaining cost to reach the goal. Admissibility guarantees A* will always find the shortest path.",
          },
          {
            user: "Can Dijkstra handle negative edge weights?",
            assistant:
              "No, Dijkstra assumes adding an edge never decreases path cost. If negative edge weights exist, use the Bellman-Ford algorithm instead.",
          },
        ],
      },
    ],
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting database seeding...");

    // 1. Clean existing records for a fresh seed
    await client.query("BEGIN");
    console.log("🧹 Resetting existing tables...");
    await client.query(
      "TRUNCATE TABLE messages, conversations, refresh_tokens, users RESTART IDENTITY CASCADE;",
    );

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    let totalUsers = 0;
    let totalConvos = 0;
    let totalMessages = 0;

    // 2. Iterate each user
    for (const userData of SEED_USERS) {
      // Password is the same as the email, hashed with bcrypt salt 10
      const hashedPassword = await bcrypt.hash(userData.email, 10);

      const userRes = await client.query(
        `INSERT INTO users (name, email, hashed_password, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING id, name, email;`,
        [userData.name, userData.email, hashedPassword],
      );
      const user = userRes.rows[0];
      totalUsers++;
      console.log(`👤 Created user ${user.id}: ${user.name} (${user.email})`);

      // 5 conversations spread across the past 30 days
      // We give each conversation a realistic offset within the past 30 days
      // E.g., bucketed so they span across the month:
      // Convo 0: 24-28 days ago
      // Convo 1: 18-22 days ago
      // Convo 2: 12-16 days ago
      // Convo 3: 5-9 days ago
      // Convo 4: 0.1-2 days ago (recent/today)
      const timeBuckets = [
        { minDays: 24, maxDays: 28 },
        { minDays: 17, maxDays: 22 },
        { minDays: 10, maxDays: 15 },
        { minDays: 4, maxDays: 8 },
        { minDays: 0.1, maxDays: 2 },
      ];

      for (let cIdx = 0; cIdx < userData.conversations.length; cIdx++) {
        const convoData = userData.conversations[cIdx];
        if (!convoData) continue;

        const bucket = timeBuckets[cIdx] ?? { minDays: 1, maxDays: 28 };

        // Random offset within the bucket
        const randomDays =
          bucket.minDays + Math.random() * (bucket.maxDays - bucket.minDays);
        const convoStartTime = new Date(now - randomDays * ONE_DAY_MS);

        // Pick random number of turns between 3 and 6 (i.e. 3 to 6 messages each side)
        const desiredTurns = 3 + Math.floor(Math.random() * 4); // 3, 4, 5, or 6
        const numTurns = Math.min(convoData.turns.length, Math.max(3, desiredTurns));
        const selectedTurns = convoData.turns.slice(0, numTurns);

        // Insert conversation
        const convRes = await client.query(
          `INSERT INTO conversations (user_id, title, created_at)
           VALUES ($1, $2, $3)
           RETURNING id, title, created_at;`,
          [user.id, convoData.title, convoStartTime],
        );
        const conv = convRes.rows[0];
        totalConvos++;

        let currentMsgTime = convoStartTime.getTime();

        // Insert alternating turns (user, then assistant)
        for (const turn of selectedTurns) {
          // 1. User message
          const userMsgDate = new Date(currentMsgTime);
          await client.query(
            `INSERT INTO messages (conversation_id, by_user, content, created_at)
             VALUES ($1, true, $2, $3);`,
            [conv.id, turn.user, userMsgDate],
          );
          totalMessages++;

          // Assistant responds 15 to 45 seconds later
          currentMsgTime += 15000 + Math.floor(Math.random() * 30000);

          // 2. Assistant message
          const assistantMsgDate = new Date(currentMsgTime);
          await client.query(
            `INSERT INTO messages (conversation_id, by_user, content, created_at)
             VALUES ($1, false, $2, $3);`,
            [conv.id, turn.assistant, assistantMsgDate],
          );
          totalMessages++;

          // User waits 1 to 5 minutes before replying to the assistant
          currentMsgTime += 60000 + Math.floor(Math.random() * 240000);
        }
      }
    }

    await client.query("COMMIT");
    console.log("\n✨ Database seeding completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Users created: ${totalUsers}`);
    console.log(`   - Conversations created: ${totalConvos} (5 per user)`);
    console.log(
      `   - Messages created: ${totalMessages} (3 to 6 pairs per conversation)`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
