import os

def distribute():
    with open('chunks.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    chunks = [c.strip() for c in content.split('----------') if c.strip()]

    admissions_chunks = []
    program_chunks = []
    scholarship_chunks = []
    policy_chunks = []
    general_chunks = []

    for chunk in chunks:
        lower_chunk = chunk.lower()
        if any(k in lower_chunk for k in ["deadline for admission", "admission test", "admissions process", "admission status", "admission deferment", "eligibility criteria", "fee structure", "work experience required"]):
            admissions_chunks.append(chunk)
        elif any(k in lower_chunk for k in ["financial assistance", "financial aid", "scholarship"]):
            scholarship_chunks.append(chunk)
        elif any(k in lower_chunk for k in ["the programs", "master of business", "bs in", "capstone", "assessment scheme", "grading scheme", "specializations are offered", "credit hour mba", "pre-engineering", "classes commence", "duration of a semester", "class timings", "transfer of credits", "prerequisites", "teaching methodology"]):
            program_chunks.append(chunk)
        elif any(k in lower_chunk for k in ["registration", "repeating courses", "freezing a semester", "maximum degree duration", "unregistered students", "attendance", "exceptional leave", "internship", "examination guidelines", "missed examinations", "minimum cgpa", "student progression", "honors and awards", "undesired conduct", "dress code", "social media conduct", "class discipline", "internal support manual", "student handbook", "rules & regulations"]):
            policy_chunks.append(chunk)
        else:
            general_chunks.append(chunk)

    # Write to files
    def write_chunks(cat, filename, data):
        os.makedirs(os.path.join('admin_files', cat), exist_ok=True)
        with open(os.path.join('admin_files', cat, filename), 'w', encoding='utf-8') as f:
            f.write('\n----------\n'.join(data))

    write_chunks('admission', 'admission_info.txt', admissions_chunks)
    write_chunks('program', 'program_info.txt', program_chunks)
    write_chunks('scholarship', 'scholarship_info.txt', scholarship_chunks)
    write_chunks('student_policy', 'student_policy_info.txt', policy_chunks)
    write_chunks('general', 'general_info.txt', general_chunks)

if __name__ == '__main__':
    distribute()
