"""Ports - abstract interfaces (Protocols / ABCs) that the domain depends on.

Concrete implementations live in app.infrastructure and are wired in at
composition time. This is the seam that lets us swap PostgreSQL, audit sinks,
or notification channels without touching business logic."""