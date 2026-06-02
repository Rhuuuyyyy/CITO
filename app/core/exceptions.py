"""Domain-neutral exception hierarchy for the SXFp backend.

The presentation layer maps these to HTTP responses (RFC 7807 Problem Details).
The domain layer NEVER raises fastapi.HTTPException — it raises these instead.
"""


class SXFpError(Exception):
    code: str = "cito.error"


class DomainError(SXFpError): # Regra de negocio violada (ex. score invalido)
    code = "domain.error"


class NotFoundError(SXFpError): # Recurso nao existe
    code = "resource.not_found"


class ConflictError(SXFpError): # Recurso ja existe
    code = "resource.conflict"


class AuthenticationError(SXFpError): # USuario nao esta logado
    code = "auth.unauthenticated"


class AuthorizationError(SXFpError): # Usuario logado mas nao tem permissao
    code = "auth.forbidden"


class LGPDComplianceError(SXFpError): # Violacao de privacidade
    code = "lgpd.violation"