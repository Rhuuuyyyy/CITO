

class SXFpError(Exception):
    code: str = "cito.error"


class DomainError(SXFpError):
    code = "domain.error"


class NotFoundError(SXFpError):
    code = "resource.not_found"


class ConflictError(SXFpError):
    code = "resource.conflict"


class AuthenticationError(SXFpError):
    code = "auth.unauthenticated"


class AuthorizationError(SXFpError):
    code = "auth.forbidden"


class LGPDComplianceError(SXFpError):
    code = "lgpd.violation"