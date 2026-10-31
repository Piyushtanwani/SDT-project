package com.elearning.config;

import com.elearning.models.Course;
import com.elearning.models.ExamQuestion;
import com.elearning.models.Module;
import com.elearning.models.Skill;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.repositories.SkillRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds a realistic technical assessment catalog into an empty database.
 * It never touches existing rows: if any course is present, seeding is skipped.
 */
@Component
public class ContentSeeder {

    private static final Logger log = LoggerFactory.getLogger(ContentSeeder.class);

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final SkillRepository skillRepository;

    public ContentSeeder(CourseRepository courseRepository,
                         ModuleRepository moduleRepository,
                         ExamQuestionRepository examQuestionRepository,
                         SkillRepository skillRepository) {
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.skillRepository = skillRepository;
    }

    @Transactional
    public void seedIfEmpty() {
        seedSkillsIfEmpty();

        if (courseRepository.count() > 0) {
            log.info("Courses already exist; demo content seeding skipped.");
            return;
        }

        int moduleCount = 0;
        int questionCount = 0;
        for (CourseSeed seed : catalog()) {
            Course course = new Course();
            course.setName(seed.name());
            course.setDescription(seed.description());
            course.setDuration(seed.duration());
            course.setRating(seed.rating());
            course = courseRepository.save(course);

            int moduleNumber = 1;
            for (Mod mod : seed.modules()) {
                Module module = new Module();
                module.setCourseId(course.getId());
                module.setModuleNumber(moduleNumber++);
                module.setModuleTitle(mod.title());
                module.setContent(new ArrayList<>(mod.content()));
                module.setImageUrls(new ArrayList<>());
                module.setLastUpdated(LocalDateTime.now());
                moduleRepository.save(module);
                moduleCount++;
            }

            List<ExamQuestion> questions = new ArrayList<>();
            for (Q q : seed.questions()) {
                ExamQuestion question = new ExamQuestion();
                question.setCourseId(course.getId());
                question.setQuestionText(q.text());
                question.setOptionA(q.a());
                question.setOptionB(q.b());
                question.setOptionC(q.c());
                question.setOptionD(q.d());
                question.setCorrectOption(q.correct());
                question.setExplanation(q.explanation());
                question.setDifficulty(q.difficulty());
                questions.add(question);
            }
            examQuestionRepository.saveAll(questions);
            questionCount += questions.size();
        }

        log.info("Seeded {} courses, {} modules and {} exam questions.",
                catalog().size(), moduleCount, questionCount);
    }

    private void seedSkillsIfEmpty() {
        if (skillRepository.count() > 0) {
            return;
        }
        List<String> names = List.of(
                "Java", "Python", "C", "C++", "C#", "Go", "Rust", "JavaScript", "TypeScript",
                "React", "Angular", "Vue.js", "Node.js", "Spring Boot", "Django",
                "HTML", "CSS", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis",
                "Docker", "Kubernetes", "AWS", "Azure", "Linux", "Git",
                "REST APIs", "System Design", "Data Structures", "Algorithms",
                "Operating Systems", "Computer Networks", "Cybersecurity", "Machine Learning");
        for (String name : names) {
            Skill skill = new Skill();
            skill.setName(name);
            skillRepository.save(skill);
        }
        log.info("Seeded {} community skills", names.size());
    }

    record Q(String text, String a, String b, String c, String d,
             String correct, String explanation, String difficulty) {
    }

    static List<Q> allQuestions() {
        return catalog().stream().flatMap(seed -> seed.questions().stream()).toList();
    }

    private record Mod(String title, List<String> content) {
    }

    private record CourseSeed(String name, String description, String duration, double rating,
                              List<Mod> modules, List<Q> questions) {
    }

    private static List<CourseSeed> catalog() {
        return List.of(java(), python(), cpp(), javascript(), go(), rust(), sql(), nosql(),
                dsa(), dbmsOs(), networks(), systemDesign(), devops(), security());
    }

    private static CourseSeed java() {
        return new CourseSeed("Java", "Objects, collections, the JVM and the concurrency tools behind production Java services.", "6 weeks", 4.8,
                List.of(
                        new Mod("Objects, Types and the JVM", List.of(
                                "Java is a statically typed, class-based language. Every object descends from java.lang.Object, and method dispatch for overridden instance methods happens at runtime through the object's class.",
                                "Strings are immutable and string literals are interned, so two literals with the same characters usually reference the same instance. Use equals() for value comparison and == only when identity is truly what you mean.",
                                "The JVM separates heap, stack and metaspace: objects live on the heap, each thread has its own stack for frames and local variables, and class metadata lives in metaspace.")),
                        new Mod("Collections, Streams and Concurrency", List.of(
                                "ArrayList gives O(1) random access and amortized append; HashMap gives expected O(1) lookup and resizes when the entry count exceeds capacity times the load factor (0.75 by default).",
                                "Streams are lazy: intermediate operations such as filter and map build a pipeline, and a terminal operation such as collect or forEach drives execution.",
                                "Concurrency requires more than synchronization: volatile guarantees visibility and ordering but not atomicity, so compound updates still need locks or atomic classes."))),
                List.of(
                        new Q("A subclass wants to replace the behaviour of an inherited instance method at runtime. Which mechanism does Java provide?", "Method overloading", "Method overriding", "Encapsulation", "Static binding", "B", "Overriding is resolved dynamically against the actual object type; overloading is resolved at compile time by signature.", "EASY"),
                        new Q("Given String s1 = 'java'; and String s2 = 'java'; what does s1 == s2 evaluate to?", "true, because literals are interned and share one instance", "false, because == always compares characters", "false, because every literal creates a new object", "It does not compile", "A", "Both literals come from the string pool, so the references are equal. Value comparison should still use equals().", "MEDIUM"),
                        new Q("In a default HashMap, what triggers a resize of the internal table?", "Each time two keys collide, because collision resolution needs a larger table", "When a negative hash code is stored", "After every put call, regardless of size", "When the entry count exceeds 75% of the current capacity", "D", "The default load factor is 0.75. Collisions are handled by chaining or treeification and do not by themselves force a resize.", "MEDIUM"),
                        new Q("Which statement about checked exceptions is correct?", "RuntimeException must always be declared in throws so callers can recover", "A checked exception must be caught or declared in the method signature", "Errors extend Exception and are checked", "finally executes only when no exception is thrown", "B", "The compiler enforces catch-or-declare for checked exceptions. RuntimeException and Error are unchecked, and finally runs in both normal and exceptional paths.", "EASY"),
                        new Q("What happens when add(4) is called on a list created with List.of(1, 2, 3)?", "UnsupportedOperationException", "ClassCastException", "ConcurrentModificationException", "ArrayIndexOutOfBoundsException", "A", "List.of returns an unmodifiable list, so structural modification throws UnsupportedOperationException.", "EASY"),
                        new Q("Which stream operation is terminal?", "filter", "peek", "collect", "map", "C", "collect consumes the pipeline and produces a result. filter, map and peek are intermediate and return another stream.", "EASY"),
                        new Q("A class implements two interfaces that both declare the same default method. What must the class do?", "The first interface listed wins", "The second interface listed wins", "Override the method to resolve the conflict", "Nothing; Object.toString is used instead", "C", "When two inherited defaults conflict, the compiler requires an explicit override, which may delegate with InterfaceName.super.method().", "HARD"),
                        new Q("Two resources are opened in one try-with-resources statement. In what order does Java close them?", "In declaration order", "Only the first resource is closed", "Only when an exception occurs", "In reverse order of declaration", "D", "Resources are closed in reverse order, mirroring stack unwinding. All resources are closed whether or not an exception occurred.", "MEDIUM"),
                        new Q("Where are local variables of a running method stored?", "In the young generation of the heap", "In the stack frame of the executing thread", "In metaspace", "In the constant pool", "B", "Each thread has a stack of frames; primitives and object references declared locally live in the frame, while the objects themselves live on the heap.", "MEDIUM"),
                        new Q("What does the volatile keyword guarantee for a field?", "It makes compound operations such as count++ atomic for every thread", "It provides mutual exclusion between threads", "It guarantees visibility of writes and prevents certain reorderings", "It persists the field to disk", "C", "Volatile establishes happens-before for reads and writes of that field but does not make read-modify-write sequences atomic.", "HARD")));
    }

    private static CourseSeed python() {
        return new CourseSeed("Python", "Readable Python with correct object semantics, generators, environment isolation and the GIL in mind.", "5 weeks", 4.7,
                List.of(
                        new Mod("Core Semantics", List.of(
                                "Python is dynamically typed but strongly typed: names are bound to objects, and objects carry their own type. Mutable objects such as lists and dictionaries can change in place, while tuples and strings cannot.",
                                "Default arguments are evaluated once at function definition, so a mutable default such as b=[] is shared by every call that omits the argument. Use None as the sentinel and create the object inside the function.",
                                "Sequence slicing returns a new object: nums[1:4] selects indexes 1, 2 and 3 with the stop index excluded.")),
                        new Mod("Concurrency and Packaging", List.of(
                                "CPython serializes bytecode execution with the Global Interpreter Lock. Threads still help I/O-bound work because the lock is released during blocking calls, but CPU-bound parallelism needs processes.",
                                "Generators produce values lazily with yield, keeping one frame of state between iterations and avoiding materializing large collections in memory.",
                                "Each project should own a virtual environment (venv or conda) so dependency versions stay reproducible and isolated from the system interpreter."))),
                List.of(
                        new Q("A function is declared as def add(item, bucket=[]). Calls that omit bucket show unexpected shared state. Why?", "A fresh list is created for every call", "Python raises a SyntaxError at definition time", "The argument is automatically copied", "The same list object is reused across calls", "D", "Default expressions are evaluated once when the def statement executes, so the same mutable list is reused unless a new one is created inside the body.", "MEDIUM"),
                        new Q("Which statement best describes the GIL in CPython?", "Threads run bytecode in parallel on multiple cores whenever the GIL is free", "Threads suit I/O-bound work but do not give CPU parallelism in CPython", "The GIL removes the need for locks in all cases", "The GIL only applies to asyncio", "B", "Only one thread executes Python bytecode at a time. Blocking I/O releases the GIL, which is why threaded network or file work still scales.", "MEDIUM"),
                        new Q("What is the difference between is and == in Python?", "They are always interchangeable", "is compares values; == compares identity", "is compares identity; == compares values", "Both compare identity when run with -O", "C", "is asks whether two names reference the same object; == delegates to __eq__ and usually compares value.", "EASY"),
                        new Q("Which objects can be used as dictionary keys?", "Any object, including lists", "Hashable objects only", "Strings only", "Integers only", "B", "Keys must implement __hash__ and stable equality. Lists are mutable and therefore unhashable, while tuples of hashable values are valid keys.", "EASY"),
                        new Q("What does a with open(...) as f: block guarantee?", "The file is closed when the block exits, even on exceptions", "The file is loaded entirely into memory before the block starts", "The file is locked against other processes", "Writes are flushed only at interpreter exit", "A", "The context manager calls __exit__, which closes the file on both normal and exceptional exits.", "EASY"),
                        new Q("What is the first argument of a method decorated with @classmethod?", "The instance", "The class itself", "Nothing; it is an alias for @staticmethod", "A copy of the module", "B", "classmethod receives cls, which makes it useful for alternative constructors that must respect subclassing.", "MEDIUM"),
                        new Q("Which statement about generators is correct?", "They materialize every value before the first iteration", "They cannot be used inside for loops", "They yield values lazily and retain their state between iterations", "They are always faster than list comprehensions", "C", "A generator pauses at each yield and resumes with its local state intact, so memory use stays proportional to the current value rather than the whole sequence.", "MEDIUM"),
                        new Q("How does Python resolve an attribute when a class inherits from several bases?", "Depth-first, left-to-right, without merging", "Right-to-left breadth-first", "Alphabetical order of class names", "C3 linearization", "D", "Python builds the method resolution order with C3 linearization, which keeps local precedence and the monotonicity of every base's order.", "HARD"),
                        new Q("Why create a virtual environment for each project?", "It isolates project dependencies in a dedicated environment", "It compiles Python to native machine code for faster execution", "It installs packages globally by default", "It replaces pip with a package registry", "A", "A venv owns its own site-packages directory, so upgrades in one project cannot break another. Interpreter speed is unchanged.", "EASY"),
                        new Q("What does nums[1:4] return for nums = [10, 20, 30, 40, 50]?", "[20, 30, 40]", "[10, 20, 30]", "[20, 30, 40, 50]", "[10, 20, 30, 40]", "A", "Slicing includes the start index and excludes the stop index, producing elements at positions 1, 2 and 3.", "EASY")));
    }

    private static CourseSeed cpp() {
        return new CourseSeed("C++", "Deterministic resource management, the object model, templates and the sharp edges of undefined behaviour.", "7 weeks", 4.6,
                List.of(
                        new Mod("Object Model and Lifetime", List.of(
                                "C++ ties resource lifetime to object lifetime through RAII: constructors acquire, destructors release. This makes smart pointers, locks and file handles safe across early returns and exceptions.",
                                "A base class that will be deleted through a base pointer needs a virtual destructor; otherwise the derived destructor never runs and the behaviour is undefined.",
                                "The rule of five states that if a class defines any of destructor, copy constructor, copy assignment, move constructor or move assignment, it should usually define or delete all five.")),
                        new Mod("Generic and Modern C++", List.of(
                                "Templates provide compile-time polymorphism: the compiler instantiates a distinct version per type, unlike virtual dispatch which resolves at runtime through a vtable.",
                                "std::move does not move anything by itself; it casts an expression to an rvalue reference so that a move-aware constructor or assignment can take ownership of its resources.",
                                "Undefined behaviour is not the same as a crash: signed integer overflow, out-of-bounds access and use-after-free can appear to work while giving the optimizer freedom to change program meaning."))),
                List.of(
                        new Q("Why should a polymorphic base class declare a virtual destructor?", "It allows deletion through a base pointer without undefined behaviour", "It makes the destructor run twice for derived objects during cleanup chains", "It is required for stack-allocated objects", "It prevents further inheritance", "A", "Without virtual dispatch the base destructor runs but the derived destructor is skipped, leaking derived resources and causing undefined behaviour.", "MEDIUM"),
                        new Q("Which description matches RAII?", "A feature that frees memory only at program exit", "A garbage collector for C++", "A macro-based exception handler", "Binding resource lifetime to object lifetime", "D", "Constructors acquire the resource and destructors release it, so scope exit provides deterministic cleanup.", "EASY"),
                        new Q("What does std::move(x) actually do?", "Physically copies the object and immediately deletes the original source", "Casts an expression to an rvalue reference so move semantics can apply", "Works only on raw pointers", "Guarantees the source is left unchanged", "B", "std::move is an unconditional cast. Whether resources are transferred depends on the target constructor or assignment operator.", "MEDIUM"),
                        new Q("Which statement about std::unique_ptr is correct?", "It allows multiple owners with atomic reference counting", "It cannot be returned from a function", "It represents exclusive ownership and is movable but not copyable", "It requires a manual delete", "C", "Unique ownership is encoded in the type: copies are deleted and ownership is transferred with move.", "MEDIUM"),
                        new Q("Signed integer overflow in C++ is best described as:", "Wrapping around predictably on all platforms", "Throwing std::overflow_error", "Undefined behaviour", "Saturating at INT_MAX", "C", "Unlike unsigned arithmetic, signed overflow is undefined; the optimizer may assume it never happens.", "HARD"),
                        new Q("What is the effect of push_back causing a std::vector reallocation?", "It invalidates iterators and references to existing elements", "It preserves all iterators but invalidates pointers", "It is guaranteed never to happen", "It only happens when shrink_to_fit is called", "A", "Reallocation moves elements to new storage, so anything pointing into the old buffer dangles.", "MEDIUM"),
                        new Q("Which set of operations does the rule of five cover?", "Copy constructor and copy assignment only, because move operations are generated automatically", "The destructor only", "Destructor, copy constructor, copy assignment, move constructor and move assignment", "Virtual destructor and friend functions", "C", "The rule exists because declaring one special member can suppress or misalign the others, especially move operations.", "MEDIUM"),
                        new Q("What does const int* p mean?", "p cannot be reassigned, but *p can change", "*p cannot change through p, but p can point elsewhere", "Both p and *p are constant because const applies to the whole declaration", "The declaration is invalid", "B", "The pointee is const-qualified; the pointer itself remains assignable. int* const p would be the opposite.", "MEDIUM"),
                        new Q("What advantage do templates have over virtual functions?", "They resolve at runtime through a vtable", "They require heap allocation for each instance", "They cannot accept class types", "They provide compile-time polymorphism", "D", "Template instantiation happens during compilation, which enables inlining and type-specific optimization at the cost of code size.", "HARD"),
                        new Q("Which situation is a memory leak?", "Allocated memory that is no longer reachable and never freed", "A pointer that has been set to nullptr while it still owned the allocation", "A reference that outlives a stack object", "A delete call on a smart pointer", "A", "Losing the last pointer to heap memory makes the allocation unreachable while it still occupies memory; smart pointers exist to prevent this.", "EASY")));
    }

    private static CourseSeed javascript() {
        return new CourseSeed("JavaScript", "Modern JavaScript semantics, the event loop, prototypes and the React patterns used in this application.", "6 weeks", 4.8,
                List.of(
                        new Mod("Language Semantics", List.of(
                                "Values have types, but typeof has two famous quirks: typeof null is 'object', and typeof a function is 'function'. Prefer Array.isArray and explicit null checks over clever typeof tests.",
                                "The event loop drains the microtask queue after each task. Promise callbacks therefore run before a setTimeout callback scheduled in the same turn.",
                                "const prevents reassignment of the binding, not mutation of the referenced object. Freezing an object requires Object.freeze or immutable update patterns.")),
                        new Mod("Application Patterns", List.of(
                                "Closures capture variable bindings, not snapshots. That is why a loop using var can expose the final value to every callback while let creates a fresh binding per iteration.",
                                "Arrow functions take this lexically from the surrounding scope, which makes them convenient for callbacks but unsuitable as object methods that need their own receiver.",
                                "In React, keys let the reconciler match elements between renders. State updates are batched, so repeated setCount(count + 1) calls in one handler both read the same stale value; functional updates fix that."))),
                List.of(
                        new Q("What does typeof null return?", "'null'", "'undefined'", "'boolean'", "'object'", "D", "This is a long-standing JavaScript quirk: the null tag was historically encoded as an object reference.", "EASY"),
                        new Q("What order does this print? console.log('A'); setTimeout(() => console.log('B')); Promise.resolve().then(() => console.log('C')); console.log('D');", "A B C D", "A D B C", "A D C B", "D A C B", "C", "Synchronous code prints A and D first, then the microtask queue runs C, and the timer task prints B.", "HARD"),
                        new Q("What does declaring an object with const actually guarantee?", "It freezes the object so properties cannot change after initialization or reassignment", "It prevents reassignment of the binding but allows property mutation", "It makes the object immutable in strict mode", "It is a syntax error for objects", "B", "const guards the name, not the value. Use Object.freeze for shallow immutability or immutable update patterns.", "EASY"),
                        new Q("Which statement about closures is correct?", "They copy the value of every outer variable at creation time", "They only work with var declarations", "They capture the variable binding, so later changes are visible", "They are removed by the garbage collector immediately", "C", "A closure keeps the environment alive, and reads observe the current value of captured bindings.", "MEDIUM"),
                        new Q("How is this determined inside an arrow function?", "It is rebound by call()", "It always refers to window", "It is undefined in strict mode unless the caller binds it explicitly", "It is defined by the enclosing lexical scope", "D", "Arrow functions have no own this; call, apply and bind cannot change the receiver.", "MEDIUM"),
                        new Q("When an object does not have an own property, how is it resolved?", "Property lookup walks the prototype chain", "Every object has a copy of all prototype methods", "Prototypes are only available with class syntax", "Object.create(null) creates a frozen object", "A", "The prototype chain is consulted until the property is found or the chain ends at null.", "MEDIUM"),
                        new Q("In strict mode, what happens when you assign to an undeclared variable?", "A ReferenceError is thrown", "The variable becomes global", "The assignment is silently ignored", "The value is stored in the prototype", "A", "Strict mode turns that silent global creation into an error, catching typos early.", "EASY"),
                        new Q("In React, what is the primary purpose of the key prop in a list?", "It sets the DOM id attribute", "It lets React match elements between renders", "It controls CSS order", "It is only required for the first item", "B", "Stable keys preserve component identity and local state during reconciliation.", "MEDIUM"),
                        new Q("A component calls setCount(count + 1) twice in one click handler. What is the result?", "The counter increases by two because each call triggers a separate re-render", "The counter stays the same", "The counter increases by one because both calls read the same stale value", "React throws an error", "C", "Updates are batched and both expressions use the count from the current render; use setCount(c => c + 1) twice to increment twice.", "HARD"),
                        new Q("What distinguishes Promise.all from Promise.allSettled?", "Promise.all resolves with all results even if some reject", "allSettled rejects on the first failure", "They are identical", "Promise.all fails fast; allSettled resolves with statuses", "D", "Use all when every result is required, and allSettled when partial success is acceptable.", "HARD")));
    }

    private static CourseSeed go() {
        return new CourseSeed("Go", "Goroutines, channels, explicit errors and the small set of rules that make Go services predictable.", "5 weeks", 4.6,
                List.of(
                        new Mod("Concurrency Foundations", List.of(
                                "Goroutines are scheduled by the Go runtime and start cheaply. Channels are the typed conduits used both to pass values and to synchronize completion.",
                                "A buffered channel decouples sender and receiver until the buffer is full; a send then blocks until space is available. Unbuffered channels synchronize both sides on every exchange.",
                                "defer schedules a call for function exit, and deferred calls run in last-in-first-out order, which makes cleanup compose naturally.")),
                        new Mod("Types, Errors and Tooling", List.of(
                                "Interfaces are satisfied implicitly: any type with the required method set implements the interface, so packages stay decoupled without registration.",
                                "Errors are ordinary values returned by functions. Callers decide whether to handle, wrap with fmt.Errorf('%w') or propagate, and panic is reserved for unrecoverable programmer errors.",
                                "The race detector instruments memory accesses at runtime: go test -race and go run -race report data races that tests happen to trigger."))),
                List.of(
                        new Q("What happens when a goroutine sends on a buffered channel that is full?", "The value is silently dropped", "The channel grows automatically", "The sender blocks until space is available", "The program panics", "C", "A full buffer makes the send block; only a closed channel causes a panic on send.", "MEDIUM"),
                        new Q("In what order do deferred calls run when a function returns?", "In declaration order", "In reverse order of declaration", "Only the last defer runs", "In random order", "B", "Defers are stacked: the most recently deferred call runs first.", "EASY"),
                        new Q("s is a slice with spare capacity and t = append(s[:2], 9) stays within it. What is s[2] afterwards?", "It stays 3 because slices copy their elements when appended to", "The program fails to compile", "The program panics at runtime", "It becomes 9 because append reused the same backing array", "D", "Slices are descriptors over a backing array. Appending within capacity writes into shared storage, a classic aliasing bug.", "HARD"),
                        new Q("What happens when you read from a nil map, and when you write to one?", "Reading returns the zero value; writing panics", "Both reads and writes panic", "Both reads and writes are safe because nil maps are initialized lazily", "The compiler rejects nil maps", "A", "A nil map behaves like an empty map for reads, but there is no storage to write to, so assignment panics. Use make first.", "MEDIUM"),
                        new Q("How does idiomatic Go report a recoverable failure?", "By throwing exceptions that callers catch", "By panicking and recovering at the top level", "By returning an error value that the caller handles", "By writing to a global error variable", "C", "Errors are explicit return values; ignoring them is visible in code review and the compiler helps with unused results.", "EASY"),
                        new Q("How does a concrete type satisfy an interface in Go?", "It must explicitly declare that it implements the interface", "Interfaces can have fields", "Only pointer receivers can satisfy interfaces", "Implicitly, by defining the required method set", "D", "There is no implements keyword; satisfaction is structural and checked by the compiler at assignment.", "MEDIUM"),
                        new Q("What does go test -race do?", "It instruments the binary and reports data races observed at runtime", "It proves the absence of races by static analysis", "It prevents all races at compile time", "It only works for packages without goroutines", "C", "The detector catches races that actually execute during the test, so coverage depends on the exercised paths.", "MEDIUM"),
                        new Q("What is the effect of a default case inside select?", "It makes the select block indefinitely until a channel becomes ready", "It runs when no other case is ready, making the select non-blocking", "It is required in every select", "It panics when no channel is ready", "B", "A default case turns select into a non-blocking poll of the listed channels.", "HARD"),
                        new Q("What is context primarily used for?", "Storing application configuration in a global variable", "Replacing goroutines", "Guaranteeing strongly typed values", "Propagating cancellation and deadlines across call boundaries", "D", "Context carries cancellation, deadlines and request-scoped values through APIs that accept it as the first parameter.", "MEDIUM"),
                        new Q("Given s := make([]int, 0, 10), what are len(s) and cap(s)?", "0 and 10", "10 and 10", "0 and 0", "10 and 0", "A", "make with a length of zero and a capacity of ten allocates storage without exposing elements yet.", "EASY")));
    }

    private static CourseSeed rust() {
        return new CourseSeed("Rust", "Ownership, borrowing and traits: the rules that let Rust guarantee memory safety without a garbage collector.", "7 weeks", 4.7,
                List.of(
                        new Mod("Ownership and Borrowing", List.of(
                                "Every value has exactly one owner. When the owner goes out of scope the value is dropped, which makes resource cleanup deterministic and eliminates double frees.",
                                "Borrowing follows one rule: at any moment you may have either any number of shared references or exactly one mutable reference, never both.",
                                "Lifetimes are annotations that tell the compiler how long references remain valid. They describe relationships; they do not change runtime behaviour or allocate memory.")),
                        new Mod("Types and Abstraction", List.of(
                                "Option<T> models presence or absence without a null pointer, and the compiler forces callers to handle the None case before using the value.",
                                "String owns a growable UTF-8 buffer on the heap; &str is a borrowed view into string data. Functions that only read should accept &str so callers keep ownership.",
                                "Traits define shared behaviour and can be implemented for foreign types under the orphan rules. dyn Trait enables runtime dispatch through a vtable when a heterogeneous collection is needed."))),
                List.of(
                        new Q("Which ownership statement is correct?", "Multiple mutable owners are allowed", "Each value has exactly one owner at a time", "Values are reclaimed by a garbage collector", "Ownership transfers only when clone is called", "B", "Ownership moves on assignment unless the type is Copy; the original binding becomes invalid after a move.", "EASY"),
                        new Q("Which borrowing combination does the compiler allow?", "Any number of mutable references", "One shared reference plus one mutable reference at the same time", "References are always mutable", "Either one mutable reference or any number of shared references", "D", "This rule prevents data races and iterator invalidation at compile time.", "MEDIUM"),
                        new Q("What does Option<T> provide?", "A representation of absence without a null pointer", "A numeric wrapper only", "A value that panics when it is matched with the wrong pattern", "A garbage-collected box", "A", "The compiler requires matching both Some and None, so null-style mistakes become type errors.", "EASY"),
                        new Q("What does calling unwrap() on an Option or Result do?", "Returns a default value", "Panics if the value is None or Err", "Is rejected at compile time", "Converts Result to Option", "B", "unwrap is fine when failure is impossible; otherwise prefer match, ?, or unwrap_or for recoverable paths.", "EASY"),
                        new Q("What distinguishes String from &str?", "String is a borrowed view; &str owns the data", "Both are fixed-size arrays", "String owns its data; &str borrows a slice", "&str can be mutated in place", "C", "String can grow and owns its allocation; &str borrows existing UTF-8 and cannot be resized.", "MEDIUM"),
                        new Q("When is Rc<RefCell<T>> appropriate?", "For thread-safe shared mutation across multiple worker threads in parallel", "For single-threaded shared ownership with interior mutability", "As a lock-free queue", "Only for types that implement Send", "B", "Rc is not thread-safe; RefCell enforces borrow rules at runtime, panicking on conflicting borrows.", "HARD"),
                        new Q("What happens when a match expression is not exhaustive?", "A wildcard arm is mandatory", "Arms are evaluated in parallel", "The code fails to compile", "Match works only on enums", "C", "Exhaustiveness is checked by the compiler, which is why adding an enum variant surfaces every match that must be updated.", "MEDIUM"),
                        new Q("What is the purpose of dyn Trait?", "Runtime dispatch through a vtable", "Inheritance between structs", "Static dispatch only", "Automatic cloning of trait objects", "D", "dyn Trait stores a data pointer and a vtable pointer, enabling heterogeneous collections at the cost of dynamic dispatch.", "HARD"),
                        new Q("What do lifetime annotations describe?", "Garbage collection hints that tell the runtime when to free memory", "How long references remain valid relative to each other", "Heap allocation sizes", "Ownership transfer timing", "B", "Lifetimes are compile-time validity constraints; they disappear from the generated code.", "MEDIUM"),
                        new Q("Why commit Cargo.lock for a binary crate?", "To pin transitive dependency versions for reproducible builds", "Because Cargo ignores it for applications", "Because it lists only direct dependencies", "Because it is regenerated on every build regardless of content", "A", "For applications, a committed lock file makes builds reproducible; libraries often leave it out for downstream flexibility.", "MEDIUM")));
    }

    private static CourseSeed sql() {
        return new CourseSeed("SQL & Relational Databases", "Joins, indexes, transactions and the query shapes that separate fast PostgreSQL and MySQL systems from slow ones.", "5 weeks", 4.9,
                List.of(
                        new Mod("Query Semantics", List.of(
                                "A LEFT JOIN preserves every row from the left table and fills unmatched right-side columns with NULL, so COUNT(*) and COUNT(right_column) can disagree.",
                                "NULL is not a value but an unknown: comparisons with = return UNKNOWN, and aggregate functions such as COUNT(column) skip NULLs while COUNT(*) counts rows.",
                                "Grouping happens before HAVING. WHERE filters individual rows, GROUP BY collapses rows, and HAVING filters the resulting groups.")),
                        new Mod("Storage, Indexes and Transactions", List.of(
                                "A B-tree index accelerates equality and range lookups on the indexed prefix. A leading wildcard in LIKE '%term' leaves the prefix unknown, so a normal index cannot narrow the scan.",
                                "The SQL standard defines SERIALIZABLE as the isolation level that prevents phantom reads; engines such as PostgreSQL implement stronger snapshot semantics at REPEATABLE READ as well.",
                                "Third normal form means every non-key column depends on the key, the whole key and nothing but the key, removing transitive dependencies that cause update anomalies."))),
                List.of(
                        new Q("There are 5 orders, and 2 of them have no matching customer. What does COUNT(*) return for orders LEFT JOIN customers ON orders.customer_id = customers.id?", "3", "5", "7", "10", "B", "A LEFT JOIN keeps all 5 orders; unmatched customer columns are NULL but the rows remain.", "MEDIUM"),
                        new Q("How do COUNT(email) and COUNT(*) differ when some emails are NULL?", "They always return the same number", "COUNT(*) ignores rows containing NULLs", "COUNT(email) fails whenever a NULL is present in the column", "COUNT(email) excludes NULLs while COUNT(*) counts every row", "D", "Most aggregate functions ignore NULL inputs; COUNT(*) counts rows regardless of contents.", "EASY"),
                        new Q("Why does WHERE name LIKE '%son' usually avoid a normal B-tree index?", "It uses the index as efficiently as a prefix search because the pattern is short", "It requires a hash index on every column", "The query fails at parse time", "The leftmost prefix is unknown, so the index cannot narrow the scan", "D", "B-trees are ordered by prefix. A leading wildcard has no known prefix, leaving a sequential scan or a trigram/full-text index as options.", "HARD"),
                        new Q("According to the SQL standard, which isolation level prevents phantom reads?", "READ UNCOMMITTED", "READ COMMITTED", "SERIALIZABLE", "SNAPSHOT", "C", "SERIALIZABLE makes concurrent transactions behave as if executed one at a time, which excludes phantoms.", "MEDIUM"),
                        new Q("Which statement captures third normal form?", "No duplicate rows are allowed anywhere in the table, including nullable columns", "Every table must have a surrogate key", "Every non-key column depends on the key, the whole key and nothing but the key", "Every column must be indexed", "C", "3NF removes transitive dependencies; 2NF removes partial dependencies on part of a composite key.", "MEDIUM"),
                        new Q("What does HAVING do?", "Filters groups after aggregation", "Filters rows before grouping", "Is an alias for WHERE", "Can only be used with COUNT", "A", "HAVING sees aggregated values such as SUM(amount) > 1000, which WHERE cannot evaluate.", "EASY"),
                        new Q("What does ON DELETE CASCADE on a foreign key do?", "Defines what happens to child rows when the referenced parent row is deleted", "Deletes the parent row whenever any new child row is inserted into the table", "Applies only to updates", "Is enforced only by MySQL", "A", "Referential actions include CASCADE, RESTRICT, NO ACTION and SET NULL; CASCADE deletes dependent rows.", "EASY"),
                        new Q("What does EXPLAIN ANALYZE provide?", "Only a cost estimate without executing the query", "A permanent rewrite of the query plan", "Executes the query and reports the actual plan with timings", "Applies only to index-only scans", "C", "Actual row counts and timings reveal misestimates and slow operators that plain EXPLAIN can only guess.", "MEDIUM"),
                        new Q("How do ROW_NUMBER and RANK differ for tied values?", "Both always assign the same values to tied rows, including gaps in the sequence", "RANK leaves gaps after ties; ROW_NUMBER assigns unique consecutive numbers", "ROW_NUMBER leaves gaps after ties", "RANK is not a window function", "B", "With scores 100, 100, 90: RANK gives 1, 1, 3 while ROW_NUMBER gives 1, 2, 3.", "HARD"),
                        new Q("Which statement is a PostgreSQL upsert?", "REPLACE INTO is the standard syntax", "INSERT ... ON CONFLICT ... DO UPDATE", "UPDATE ... RETURNING performs an upsert", "PostgreSQL has no upsert support", "B", "ON CONFLICT names the arbiter constraint or index and chooses DO NOTHING or DO UPDATE.", "MEDIUM")));
    }

    private static CourseSeed nosql() {
        return new CourseSeed("NoSQL & Caching", "MongoDB document design, Redis data structures and the cache patterns that keep read-heavy services fast.", "5 weeks", 4.5,
                List.of(
                        new Mod("Document and Key-Value Modeling", List.of(
                                "MongoDB stores BSON documents. Embed data that is read together and bounded; reference data that grows without limit or is shared across documents.",
                                "Redis is a data-structure server: strings, hashes, lists, sets and sorted sets each solve a different problem. Sorted sets are the natural fit for leaderboards because scores order members in O(log n).",
                                "A compound MongoDB index can serve queries that use its prefix fields, but a query on a later field alone cannot use it efficiently.")),
                        new Mod("Caching and Scale", List.of(
                                "In cache-aside, the application reads the cache, falls back to the database on a miss, and populates the cache. Invalidation strategy matters more than the cache itself.",
                                "Redis can persist with RDB snapshots, an append-only file, or both. RDB is compact and point-in-time; AOF records writes and can be replayed with different fsync policies.",
                                "CAP says that during a network partition a distributed system must choose between consistency and availability; the useful engineering question is what the business can tolerate."))),
                List.of(
                        new Q("When is referencing preferable to embedding in MongoDB?", "Embedding is always preferred for large, unbounded arrays", "MongoDB cannot store arrays", "When child data is large or unbounded", "$lookup is mandatory for every read", "C", "Unbounded arrays push documents toward the 16 MB limit and make updates expensive; references keep documents small.", "MEDIUM"),
                        new Q("Which Redis structure is the best fit for a real-time leaderboard?", "Lists", "Hashes", "Sorted sets", "HyperLogLogs", "C", "Sorted sets keep members ordered by score with O(log n) inserts and efficient range queries by rank.", "EASY"),
                        new Q("How does the cache-aside pattern work?", "Read cache, load on a miss, populate", "The database writes to the cache automatically", "The cache is never invalidated", "Writes go only to the cache", "A", "The application owns cache population, which keeps the database as the source of truth.", "EASY"),
                        new Q("What is the difference between RDB and AOF persistence in Redis?", "RDB is an append-only log of every write", "AOF logs writes while RDB takes point-in-time snapshots", "Redis cannot persist data", "Both are off by default and unrelated to durability", "B", "RDB snapshots are compact; AOF trades file size for finer-grained durability.", "MEDIUM"),
                        new Q("A collection has the compound index {team: 1, score: -1}. Which query can use it efficiently?", "A filter on score alone, because it is the second index field", "A query with no filter", "A sort by name", "A filter on team, or on team plus score", "D", "Compound indexes are ordered by their prefix. Filtering only on score skips the leading team field.", "HARD"),
                        new Q("What makes a good MongoDB shard key?", "Low cardinality keys distribute data evenly", "A monotonically increasing key prevents hotspots", "The shard key can be changed after the first insert without downtime", "High cardinality aligned with common query filters avoids hotspots", "D", "A good shard key has high cardinality, low frequency and is present in most queries; monotonic keys concentrate writes.", "HARD"),
                        new Q("What does the allkeys-lru eviction policy do?", "Evicts the least recently used keys under memory pressure", "Deletes random keys immediately", "Prefers keys without a TTL", "Provides exact LRU with no approximation or sampling overhead", "A", "Redis samples keys and approximates LRU; allkeys-lru considers every key, unlike volatile-lru which only considers keys with a TTL.", "MEDIUM"),
                        new Q("What happens to a Redis key with a TTL?", "It is removed by lazy or active expiry once the time passes", "TTL is only supported for strings", "It is deleted at the exact millisecond boundary in every configuration", "Setting a TTL deletes the key immediately", "A", "Expiry is passive on access plus an active sampling cycle, so removal is logically guaranteed but not instant.", "MEDIUM"),
                        new Q("What does CAP require during a network partition?", "A system can guarantee consistency, availability and partition tolerance simultaneously", "The system must trade off consistency or availability", "Partition tolerance is optional in practice", "CAP applies only to SQL databases", "B", "Partition tolerance is unavoidable in distributed systems, so the real choice is between rejecting requests and serving possibly stale data.", "MEDIUM"),
                        new Q("What does MongoDB write concern control?", "The replication factor of the collection across all shards and regions", "Read isolation only", "How many nodes acknowledge a write before it is considered successful", "The size of the WiredTiger cache", "C", "Majority write concern waits for most replica-set members, trading latency for durability.", "HARD")));
    }

    private static CourseSeed dsa() {
        return new CourseSeed("Data Structures & Algorithms", "Complexity analysis, core data structures and the algorithmic patterns that appear in technical interviews.", "8 weeks", 4.9,
                List.of(
                        new Mod("Complexity and Linear Structures", List.of(
                                "Big-O describes how running time or memory grows with input size. Hash tables give expected O(1) lookup but degrade to O(n) when many keys collide.",
                                "Arrays offer O(1) indexed access and contiguous memory, while linked lists offer O(1) insertion at a known node but O(n) search because nodes are scattered.",
                                "Binary search runs in O(log n) only on data sorted by the search key; applying it to unsorted input silently produces wrong answers.")),
                        new Mod("Graphs, Trees and Optimization", List.of(
                                "BFS explores a graph level by level and finds shortest paths when every edge has the same weight; weighted graphs need Dijkstra or Bellman-Ford.",
                                "A binary heap supports insert and extract-min in O(log n) and peek in O(1), which is why it backs priority queues and heap sort.",
                                "Dynamic programming applies when a problem has overlapping subproblems and optimal substructure; memoization trades memory for avoided recomputation."))),
                List.of(
                        new Q("What are the expected and worst-case lookup costs of a hash table?", "O(1) expected and O(n) worst case", "O(log n) expected and O(n) worst case", "O(n) expected and O(n log n) worst case", "O(1) in every case", "A", "Uniform hashing gives constant expected time, but all keys landing in one bucket degrade lookup to a linear scan.", "MEDIUM"),
                        new Q("What precondition does binary search require?", "The array must contain distinct values", "A hash function must be available", "The array must be sorted by the search key", "The array length must be a power of two", "C", "Each comparison discards half the remaining range only if the ordering is guaranteed.", "EASY"),
                        new Q("Why does BFS find shortest paths in an unweighted graph?", "BFS explores nodes in order of distance from the source", "BFS uses a priority queue ordered by edge weight to expand nearest first", "BFS visits every node exactly twice", "Depth-first search is always shorter", "A", "The queue processes all nodes at distance d before any node at distance d+1, so the first visit is via a shortest path.", "MEDIUM"),
                        new Q("What is the cost of inserting into a binary heap of n elements?", "O(1)", "O(log n)", "O(n)", "O(n log n)", "B", "The new element bubbles up at most the height of the tree, which is O(log n).", "EASY"),
                        new Q("When does quicksort degrade to O(n^2)?", "When the pivot splits the array evenly into two equal halves on every pass", "When the input is already sorted and the first element is chosen as pivot", "When all elements are distinct", "When recursion is replaced by iteration", "B", "A sorted input with a fixed first-element pivot produces maximally unbalanced partitions; randomized or median pivots avoid this.", "HARD"),
                        new Q("Which conditions make dynamic programming applicable?", "Subproblems must be independent and disjoint", "Overlapping subproblems and optimal substructure", "The input must be sorted", "The problem must be a graph", "B", "Overlap makes caching worthwhile, and optimal substructure lets solutions be assembled from optimal sub-solutions.", "MEDIUM"),
                        new Q("Inserting at the head of a linked list versus an array costs what?", "Both O(1)", "Array O(1), linked list O(n) because traversal to the tail is required", "Linked list O(1), array O(n) because existing elements shift", "Both O(n)", "C", "A linked list only rewires a pointer; an array must shift every existing element unless there is spare space at the front.", "EASY"),
                        new Q("What is the lookup cost of a prefix in a trie?", "O(length of the prefix)", "O(number of stored words)", "O(log n) where n is the alphabet size", "O(1) regardless of prefix length", "A", "Each character follows one edge, so the work is proportional to the prefix rather than the dictionary size.", "MEDIUM"),
                        new Q("How does union-find detect a cycle while adding undirected edges?", "Compare node degrees", "Run Dijkstra from every node and compare all of the final distances", "A cycle exists only when edges exceed nodes", "Union the endpoints; if they already share a root, a cycle exists", "D", "If both endpoints are already connected, the new edge closes a cycle. Path compression and union by rank keep operations near constant time.", "HARD"),
                        new Q("Why can deep recursion fail in production?", "Recursion never uses stack memory", "The JVM converts all deep recursion to iteration before the stack can exhaust", "Python optimizes tail calls by default", "Each call consumes stack space, so a deep chain can exhaust the stack", "D", "Every frame is retained until its call returns; convert to an explicit stack or increase limits carefully when depth is unbounded.", "MEDIUM")));
    }

    private static CourseSeed dbmsOs() {
        return new CourseSeed("DBMS & Operating Systems", "Transactions, locking, processes, memory and the scheduling concepts interviewers expect you to connect.", "6 weeks", 4.7,
                List.of(
                        new Mod("Transactions and Concurrency", List.of(
                                "ACID stands for atomicity, consistency, isolation and durability. Isolation is the property engines tune with isolation levels, and durability depends on write-ahead logging and fsync.",
                                "Two-phase locking has a growing phase that acquires locks and a shrinking phase that releases them. Strict 2PL holds exclusive locks until commit to avoid cascading aborts.",
                                "Deadlocks can be prevented with ordering and timeouts, or detected with a wait-for graph whose victim transaction is rolled back.")),
                        new Mod("Processes, Memory and Scheduling", List.of(
                                "A process has its own virtual address space; threads within it share that space and file descriptors while keeping separate stacks and registers.",
                                "A page fault means the referenced page is not resident, so the kernel loads it from disk or swap. Excessive faulting produces thrashing, where the system spends most time paging.",
                                "Round-robin scheduling gives each runnable process a fixed time slice, improving responsiveness at the cost of context-switch overhead."))),
                List.of(
                        new Q("What does ACID stand for?", "Availability, Consistency, Integrity, Durability", "Atomicity, Concurrency, Isolation, Distribution", "Accuracy, Consistency, Isolation, Dependency", "Atomicity, Consistency, Isolation, Durability", "D", "Each property addresses a distinct failure mode: partial commits, invariants, concurrent interference and crashes.", "EASY"),
                        new Q("What are the phases of two-phase locking?", "Locks are released immediately after each read", "It prevents deadlocks through timestamp ordering", "Growing phase acquires locks; shrinking phase releases them", "It requires optimistic validation", "C", "No lock may be acquired after the first release, which guarantees serializability.", "MEDIUM"),
                        new Q("How do database systems handle deadlocks?", "Deadlocks cannot occur between transactions", "Detection aborts a victim; prevention uses ordering or timeouts", "The DBMS waits forever", "READ COMMITTED prevents all deadlocks because it releases locks early", "B", "A wait-for cycle means no transaction can proceed, so one is chosen as the victim and rolled back.", "MEDIUM"),
                        new Q("What is the key memory difference between processes and threads?", "Threads of one process share the address space; processes are isolated", "Processes share memory by default", "Threads cannot share file descriptors because each thread has its own table", "A process cannot contain multiple threads", "A", "Isolation makes processes safer but costlier to create and communicate between; threads share memory and must synchronize.", "EASY"),
                        new Q("What does a page fault indicate?", "The process has terminated", "The disk is full", "Swap is disabled, so every page fault immediately becomes a fatal error", "The referenced page is not in physical memory and must be brought in", "D", "A minor fault may be satisfied from the page cache; a major fault requires disk I/O.", "MEDIUM"),
                        new Q("What happens during a context switch?", "The kernel saves the current task state and restores the next task", "The entire heap is copied", "No overhead is incurred", "It only happens on multi-core systems", "C", "Registers, program counter and stack pointer are saved and restored, which is why excessive switching hurts throughput.", "EASY"),
                        new Q("How does a mutex differ from a counting semaphore?", "They are identical", "A semaphore cannot provide mutual exclusion", "A mutex has no owner, so any thread can release it at any time", "A mutex is an owned binary lock; a semaphore allows N permits", "D", "Ownership lets a mutex support priority inheritance and recursive locking; semaphores are counters without ownership.", "HARD"),
                        new Q("What is thrashing?", "A CPU scheduling algorithm", "High CPU utilization with no paging activity or disk I/O at all", "Excessive paging leaves little time for useful work", "A deadlock between two threads", "C", "When the working set exceeds physical memory, the system swaps pages in and out continuously and throughput collapses.", "MEDIUM"),
                        new Q("How does round-robin scheduling work?", "Each process runs to completion", "It starves short jobs because long jobs always run to completion each time", "Processes get a fixed time slice in rotation, improving responsiveness", "It requires priority aging", "C", "Each runnable process gets a quantum in turn, which bounds waiting time for interactive work.", "EASY"),
                        new Q("Why do filesystems use journaling?", "Journals encrypt every file", "Journals log metadata for crash recovery", "Journals replace backups", "Journals are only used by database systems", "B", "Replaying or discarding an incomplete journal entry avoids scanning the entire disk and prevents corrupt metadata.", "MEDIUM")));
    }

    private static CourseSeed networks() {
        return new CourseSeed("Computer Networks", "TCP, DNS, HTTP semantics, subnetting and the load-balancing vocabulary behind every web request.", "5 weeks", 4.6,
                List.of(
                        new Mod("Transport and Naming", List.of(
                                "TCP opens a connection with SYN, SYN-ACK and ACK, then provides ordered, reliable delivery with flow control and congestion control. UDP sends datagrams with no delivery or ordering guarantee.",
                                "DNS resolution usually starts at local caches, then delegates through a recursive resolver, the root servers, the TLD servers and the authoritative name servers.",
                                "NAT rewrites private source addresses to a public address for outbound traffic and tracks the mapping so replies can be routed back.")),
                        new Mod("HTTP and Edge Behaviour", List.of(
                                "HTTP is stateless, so applications carry identity in headers such as Authorization. Methods differ in semantics: GET is safe, PUT and DELETE are idempotent, POST generally is not.",
                                "A CORS preflight is an OPTIONS request the browser sends before certain cross-origin requests to learn which methods and headers the server allows.",
                                "Routers forward by IP address at the network layer; layer-7 load balancers can route by path or header, while layer-4 balancers distribute TCP connections."))),
                List.of(
                        new Q("Which sequence establishes a TCP connection?", "SYN, ACK, FIN", "ACK, SYN, RST", "SYN, SYN-ACK, ACK", "FIN, ACK, FIN-ACK", "C", "Each side announces its initial sequence number; the third ACK confirms both directions are ready.", "EASY"),
                        new Q("Which statement contrasts TCP and UDP correctly?", "UDP guarantees delivery", "Both protocols always guarantee ordering and retransmit lost segments by default", "UDP performs congestion control", "TCP is connection-oriented and reliable; UDP is connectionless and unreliable", "D", "TCP retransmits and orders; UDP leaves reliability to the application, which suits voice, games and DNS.", "EASY"),
                        new Q("What does HTTPS add to HTTP?", "It runs HTTP over UDP", "It only hides the URL", "It encrypts HTTP with TLS and authenticates the server via certificates", "It does not protect against man-in-the-middle attacks on public networks", "C", "TLS provides confidentiality and integrity, and certificate validation binds the public key to the hostname.", "MEDIUM"),
                        new Q("How does a typical DNS lookup proceed on a cold cache?", "The browser asks a root server before consulting any local cache or ISP cache", "The recursive resolver queries root, then TLD, then authoritative servers", "DNS always returns the same address", "DNS only maps addresses to names", "B", "The resolver follows referrals down the delegation chain and caches answers according to TTLs.", "MEDIUM"),
                        new Q("What does NAT do for outbound traffic from a private network?", "Assigns a public address to every device on the private network", "Encrypts all traffic", "Rewrites private source addresses to a public address", "Replaces DNS", "C", "The NAT device maintains a translation table so returning packets reach the correct internal host.", "MEDIUM"),
                        new Q("How many usable host addresses does an IPv4 /24 subnet provide?", "254", "256", "255", "128", "A", "Eight host bits give 256 addresses; the network and broadcast addresses are reserved, leaving 254 usable.", "EASY"),
                        new Q("A client receives HTTP 429. What does it mean?", "The server crashed", "The request was unauthorized", "The resource moved permanently", "The client exceeded a rate limit", "D", "429 Too Many Requests usually pairs with Retry-After so clients can back off politely.", "EASY"),
                        new Q("Which HTTP methods are idempotent?", "All methods are idempotent", "GET is not idempotent", "POST is idempotent by definition because it creates a resource", "PUT and DELETE are idempotent; POST generally is not", "D", "Repeating an idempotent request has the same effect as sending it once, which makes safe retries possible.", "MEDIUM"),
                        new Q("What triggers a CORS preflight request?", "The server sends OPTIONS to the browser", "Preflight is required for same-origin requests", "The browser sends OPTIONS before certain cross-origin requests", "CORS is enforced by the server rather than the browser", "C", "Non-simple methods or headers trigger a preflight; the browser blocks the actual request if the response does not allow it.", "HARD"),
                        new Q("At which OSI layer do routers primarily forward packets?", "Network layer (layer 3)", "Data link layer (layer 2)", "Transport layer (layer 4)", "Application layer (layer 7)", "A", "Routers inspect IP addresses and choose the next hop; switches operate on layer 2 and load balancers may use layer 4 or 7.", "EASY")));
    }

    private static CourseSeed systemDesign() {
        return new CourseSeed("System Design & APIs", "Stateless services, idempotency, caching, queues and the API contracts that survive production traffic.", "7 weeks", 4.8,
                List.of(
                        new Mod("API Contracts", List.of(
                                "REST asks that each request carry everything needed to process it, so servers can scale horizontally without sticky sessions.",
                                "Idempotency keys let a payment or order endpoint recognize retries. The server stores the key with the original result and returns that result instead of charging twice.",
                                "Cursor pagination keyset paginates on an indexed sort column, which stays stable when rows are inserted; offset pagination can skip or duplicate rows under writes.")),
                        new Mod("Scale and Failure", List.of(
                                "Caching reduces latency but introduces staleness. TTL jitter, request coalescing and stale-while-revalidate reduce cache stampedes when a hot key expires.",
                                "Queues decouple producers from consumers and absorb bursts, at the cost of eventual consistency, duplicate delivery and the need for idempotent consumers.",
                                "Observability combines metrics, structured logs and distributed traces so failures can be localized instead of guessed at."))),
                List.of(
                        new Q("What does statelessness mean in REST?", "The server stores client session state between requests", "Each request carries the information needed to process it", "REST requires SOAP", "Stateless services cannot cache responses", "B", "State may live in the client, a database or a cache, but the server does not need per-client memory to answer a request.", "EASY"),
                        new Q("Why use an idempotency key on a payment endpoint?", "It encrypts the payment payload", "It replaces authentication", "It lets the server recognize retries and avoid charging twice", "It guarantees lower latency by skipping the payment processor entirely", "C", "The key maps to the first outcome; retries return that stored outcome instead of repeating the side effect.", "MEDIUM"),
                        new Q("What makes horizontal scaling straightforward?", "Sticky sessions are required in all cases", "It cannot be combined with load balancing", "It means adding CPU to one machine", "Stateless app servers that share external storage", "D", "Any instance can serve any request, so the load balancer is free to distribute traffic.", "EASY"),
                        new Q("How does a token bucket rate limiter work?", "It blocks all bursts unconditionally", "It allows bursts up to the bucket size while enforcing an average rate", "It counts requests per user per month and resets on the first day of the month", "It is a database index", "B", "Tokens refill at a steady rate; accumulated tokens permit short bursts without exceeding the long-term rate.", "MEDIUM"),
                        new Q("Which techniques reduce a cache stampede?", "Increasing TTL always fixes it", "It is caused by too much memory being allocated to the cache", "TTL jitter, request coalescing and stale-while-revalidate", "It only happens with Redis Cluster", "C", "Spreading expirations, collapsing duplicate loads and serving stale data during refresh all reduce the thundering herd.", "HARD"),
                        new Q("Why is cursor pagination more stable than offset pagination?", "Offset pagination is always stable", "Cursors require sorting by primary key only, so they cannot use other custom indexes", "Cursor pagination cannot use indexes", "Cursors stay stable when rows change, while offsets can skip or duplicate rows", "D", "Offsets are positions in a result set; inserts shift those positions. Cursors anchor to a value in the ordered index.", "HARD"),
                        new Q("What is the main operational weakness of stateless JWTs?", "They never expire", "They cannot be individually revoked without a denylist or short expiry", "They are encrypted by default", "Deleting the browser cookie revokes them on the server on the next request", "B", "Verification needs no server lookup, which is exactly why revocation requires extra infrastructure.", "HARD"),
                        new Q("What benefit does a message queue provide during a traffic spike?", "It makes every request synchronous", "Queues remove the need for idempotency", "It decouples producers and consumers and buffers the spike", "It guarantees exactly-once delivery in every broker", "C", "Consumers drain at their own pace; most brokers offer at-least-once delivery, so consumers must deduplicate.", "MEDIUM"),
                        new Q("What trade-off comes with read replicas?", "They remove write bottlenecks", "They guarantee strong consistency", "They replace backups by keeping a full copy of every write", "They scale reads but introduce replication lag", "D", "Reads may see stale data during lag, and replicas do not help the primary accept writes.", "MEDIUM"),
                        new Q("Why are metrics, logs and traces used together?", "Logs alone always suffice", "Metrics replace tracing", "Together they make distributed failures diagnosable", "Observability only means monitoring CPU, memory and disk usage", "C", "Metrics detect symptoms, traces locate the slow hop and logs explain the specific error.", "EASY")));
    }

    private static CourseSeed devops() {
        return new CourseSeed("Cloud & DevOps", "Containers, Kubernetes, CI/CD, infrastructure as code and the reliability practices that keep services deployable.", "6 weeks", 4.7,
                List.of(
                        new Mod("Containers and Orchestration", List.of(
                                "Containers share the host kernel and isolate processes with namespaces and cgroups; virtual machines include a guest operating system and a hypervisor boundary.",
                                "A Kubernetes pod is the smallest deployable unit and groups containers that share a network namespace. Deployments manage replica sets, rolling updates and rollbacks.",
                                "Docker layer caching rewards ordering: copy manifests and install dependencies before copying source so code edits do not invalidate dependency layers.")),
                        new Mod("Delivery and Reliability", List.of(
                                "A CI/CD pipeline builds, tests and packages automatically, then deploys through stages with approvals and rollback paths.",
                                "Canary releases send a small share of traffic to the new version before a full rollout; blue-green runs two environments and switches traffic at once.",
                                "An SLO is a target for a service level indicator, and the error budget is the allowed unreliability within the period."))),
                List.of(
                        new Q("What is the key architectural difference between containers and virtual machines?", "Containers include a guest OS and a hypervisor for stronger isolation", "Containers share the host kernel while VMs include a guest OS", "VMs are always lighter than containers", "Containers cannot be isolated", "B", "Sharing the kernel makes containers smaller and faster to start but reduces the isolation boundary compared with a hypervisor.", "EASY"),
                        new Q("What is a Kubernetes pod?", "A physical server", "A persistent volume", "The smallest deployable unit, grouping containers that share networking", "A cluster-wide database that stores all pod configuration and cluster state", "C", "Containers in a pod share an IP and can communicate over localhost; the pod is scheduled as a unit.", "MEDIUM"),
                        new Q("What does a CI/CD pipeline do?", "Replaces version control by storing source code and all build artifacts", "Only runs in production", "Is a monitoring tool", "Builds and tests automatically, then deploys through controlled stages", "D", "Continuous integration validates every change; continuous delivery or deployment moves artifacts through environments.", "EASY"),
                        new Q("Why is infrastructure as code valuable?", "It requires manual console changes for every deployment", "Definitions are idempotent and reviewable in version control", "It cannot manage cloud resources", "It is only useful for DNS", "B", "Codified infrastructure can be reviewed, diffed, reproduced and rolled back like application code.", "EASY"),
                        new Q("What characterizes a canary deployment?", "All traffic switches at once", "It rolls back automatically only on Tuesdays", "It permanently runs two production clusters and splits traffic evenly", "A small share of traffic goes to the new version before full rollout", "D", "Canaries limit blast radius and expose regressions with real traffic before everyone is affected.", "MEDIUM"),
                        new Q("What is the safest way to handle application secrets?", "Commit them to the repository", "Put them in Dockerfile ENV lines so every container receives them", "Inject them at runtime from a managed secret store", "Store them in public build logs", "C", "Runtime injection keeps secrets out of images and source history, and managed stores provide rotation and audit trails.", "EASY"),
                        new Q("What signals should drive autoscaling?", "Only fixed calendar times", "CPU, queue depth or latency that reflects real load", "Autoscaling removes the need for monitoring", "Only vertical scaling is autoscaling", "B", "Scaling on a signal that tracks demand avoids both over-provisioning and late reactions.", "MEDIUM"),
                        new Q("How do you maximize Docker layer cache reuse?", "Copy the whole repository first so every layer has all the project source files", "Layers are never reused", "Copy dependency manifests and install dependencies before copying source", "Caching requires a paid registry", "C", "Ordering instructions from least to most frequently changed keeps expensive dependency layers cached.", "MEDIUM"),
                        new Q("What is a service level objective (SLO)?", "A type of database", "A target for a service level indicator, such as 99.9% availability", "A replacement for incident response", "A guarantee that error budgets never shrink during a major incident", "B", "The SLO sets the target; the error budget is the remaining allowance for unreliability.", "MEDIUM"),
                        new Q("Why use presigned URLs with object storage?", "Object stores cannot serve static assets without a presigned URL", "They grant temporary access without exposing credentials", "They require mounting a filesystem", "They make buckets permanently public", "B", "A signed URL embeds a short-lived signature, so clients can upload or download directly without holding cloud credentials.", "HARD")));
    }

    private static CourseSeed security() {
        return new CourseSeed("Cybersecurity", "Injection, broken access control, cryptography mistakes and the defensive habits that stop them.", "6 weeks", 4.8,
                List.of(
                        new Mod("Web Application Attacks", List.of(
                                "SQL injection happens when untrusted input changes query structure. Parameterized queries keep code and data separate, while escaping is engine- and context-specific.",
                                "Cross-site scripting executes attacker-controlled script in a victim's browser. Output encoding by context and a strict Content Security Policy are the primary defenses.",
                                "Cross-site request forgery abuses ambient cookies to submit state-changing requests. SameSite cookies and per-request anti-CSRF tokens prevent it.")),
                        new Mod("Identity, Crypto and Access", List.of(
                                "Passwords must be stored with a slow, salted password hash such as bcrypt, scrypt or Argon2, never with a fast general-purpose hash or plaintext.",
                                "JWT verification must check the signature and expiry and must reject unexpected algorithms, including none. The payload is readable, so it must never contain secrets.",
                                "Broken access control, such as changing an object id in a URL to read someone else's data, is consistently the top web risk; authorization must be enforced on the server for every object."))),
                List.of(
                        new Q("What is the most reliable defense against SQL injection?", "Escaping quotes is sufficient in every database", "Hiding the SQL in JavaScript helps", "A WAF alone eliminates the risk", "Parameterized queries that separate code from data", "D", "Placeholders bind values after the statement is parsed, so input cannot alter query structure.", "EASY"),
                        new Q("How is cross-site scripting best mitigated?", "XSS only affects the server", "HTTPS prevents XSS", "Output encoding plus a strict Content Security Policy", "XSS cannot occur in React because JSX escapes all user input", "C", "Encoding neutralizes context-specific dangerous characters; CSP limits script execution when encoding fails.", "MEDIUM"),
                        new Q("Which controls defend state-changing requests against CSRF?", "Stronger passwords", "Because GET cannot have side effects, CSRF is impossible", "HTTPS alone", "SameSite cookies and anti-CSRF tokens", "D", "SameSite keeps cookies off cross-site requests, and unpredictable tokens prove the request originated from the application.", "MEDIUM"),
                        new Q("How should passwords be stored?", "bcrypt or Argon2 with a per-user salt and a tunable work factor", "SHA-256 with no salt", "MD5 for speed", "Encrypted with a shared key so the application can decrypt them", "A", "Slow, salted hashes make offline cracking expensive; encryption would allow the server to recover plaintext.", "EASY"),
                        new Q("Which JWT validation errors are dangerous?", "Trusting the payload without verifying the signature", "Accepting any header algorithm sent by the client", "Storing tokens in URLs", "Rejecting the none algorithm and enforcing expiry", "C", "Tokens must be verified with a fixed algorithm and expiry check; the last option describes correct behaviour, so it is the safe choice.", "HARD"),
                        new Q("What does least privilege mean?", "Give every service admin rights to simplify operations", "Share one credential across all services", "Grant only the permissions required for the task", "Disable audit logging", "C", "Narrow permissions limit the blast radius of a compromised component or stolen credential.", "EASY"),
                        new Q("What is an IDOR vulnerability?", "A bug prevented by obscuring identifiers", "Change an id to read another user's data", "A file upload bug only", "A client-side rendering bug", "B", "The server must check that the authenticated principal is allowed to access each specific object, not just that a user is logged in.", "MEDIUM"),
                        new Q("How does TLS protect against man-in-the-middle attacks?", "HTTP is safe on public Wi-Fi", "Self-signed certificates are trusted by default and prevent all MITM attacks", "MITM requires physical access to the server", "Certificate validation binds the server identity to the encrypted session", "D", "Without certificate validation an attacker can present a forged certificate and decrypt or alter traffic.", "MEDIUM"),
                        new Q("How should third-party dependency risk be managed?", "Pin versions, scan for advisories and patch known vulnerabilities", "Ignore advisories to avoid churn", "Vendor everything without updates so the build is fully reproducible", "Only scan production servers", "A", "Automated scanning plus a patch cadence keeps known vulnerabilities from lingering in transitive dependencies.", "MEDIUM"),
                        new Q("What does multi-factor authentication add?", "It replaces the need for strong passwords", "A second factor so a stolen password alone is insufficient", "It makes phishing impossible by verifying every login attempt", "SMS codes are unbreakable", "B", "Something you know plus something you have or are raises the cost of account takeover even when a password leaks.", "EASY")));
    }
}
