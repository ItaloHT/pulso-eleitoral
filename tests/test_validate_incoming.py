import unittest
from scripts.validate_incoming import validate

class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.data={"standardModel":{"institutes":[{"name":"Datafolha"}]},"polls":[]}
        self.poll={"name":"Datafolha","date":"2026-10-18","fieldEnd":"2026-10-17",
          "f":51,"l":49,"n":2000,"registration":"BR-12345/2026",
          "url":"https://example.org/poll","verificationUrl":"https://example.org/report",
          "verificationStatus":"confirmed-official-document","voteBasis":"valid-published"}
    def test_valid_structure(self):
        self.assertEqual(validate(self.poll,self.data),[])
    def test_duplicate_registration(self):
        self.data["polls"]=[{"registration":"BR-12345/2026","name":"Datafolha","fieldEnd":"2026-10-17"}]
        self.assertTrue(validate(self.poll,self.data))
    def test_unverified(self):
        self.poll["verificationStatus"]="unverified"
        self.assertIn("Sem confirmacao documental oficial",validate(self.poll,self.data))
    def test_invalid_vote_total(self):
        self.poll["f"]=60
        self.assertIn("Percentuais/amostra invalidos",validate(self.poll,self.data))
    def test_unknown_institute(self):
        self.poll["name"]="Desconhecido"
        self.assertIn("Instituto fora do modelo padrao",validate(self.poll,self.data))
if __name__=="__main__": unittest.main()
