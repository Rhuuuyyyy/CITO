"""CPF value object - one-way hash, never logged."""
import hashlib
import re
from dataclasses import dataclass 
from typing import Annotated 

from pydantic.functional_validators import BeforeValidator 

@dataclass(frozen=True) # O frozen serve para que quando o objeto for criado, ele se torne imutável.
class CPF:
    value: str
    def __post_init__(self) -> None: # o self faz referência ao objeto criado dentro da classe. Nesse caso, o self = cpf.
        cleaned = re.sub(r"[.\-\s]", "", self.value) # re.sub serve para tratar os dados. Nesse caso, tira pontos, traços e espaços vazios (s).
        if not cleaned.isdigit() or len(cleaned) != 11: 
            raise ValueError(
                "CPF inválido: deve conter exatamente 11 dígitos numérios"
            )   
        object.__setattr__(self, "value", cleaned) # Função responsável por pausar o frozen, para que o dado seja tratado e verificado.

    @property # Usado para transformar a função em um atributo de leitura. 
    def sha256_hex(self) -> str:
        return hashlib.sha256(self.value.encode()).hexdigest() # Propriedade de leitura que transforma o self em um hash.
    def __repr__(self) -> str:
        return "CPF(***redacted***)"
    def __str__(self) -> str:
        return "***redacted***"
    


def _validate_cpf(v: object) -> CPF: # v: object significa que inicialmente, a função aceita qualquer tipo de dado. "v" é de value. -> CPF garante que vai retornar um objeto CPF.
    if isinstance(v, CPF): # Se o valor já for um cpf, simplesmente retorna o mesmo.
        return v
    if isinstance(v, str): # Se o valor for uma str, chama a função CPF para a validação de dados e retorno certo do CPF
        return CPF(v)
    raise ValueError("CPF deve ser uma string ou instância de CPF") # Se o value não se encaixar em nenhuma das insistances, retorna um ValueError


CPFAnnotated = Annotated[CPF, BeforeValidator(_validate_cpf)] # Essa é a função que deve ser solicitada fora do arquivo. Ela faz o _validate_cpf rodar primeiro (BeforeValidator).

# Funcoes fora do arquivo chamam por CPFAnnotated.



