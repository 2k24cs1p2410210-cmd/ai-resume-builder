from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_pdf():
    doc = SimpleDocTemplate("my-resume.pdf", pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)
    Story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=12
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=6
    )

    Story.append(Paragraph("Sushant Kumar", title_style))
    Story.append(Paragraph("Title: Senior Full Stack Engineer<br/>Email: sushant.kumar@example.com | Phone: +91 98765 43210<br/>LinkedIn: linkedin.com/in/sushant | GitHub: github.com/sushant | Portfolio: sushant.dev", subtitle_style))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph("Professional Summary", heading_style))
    Story.append(Paragraph("Highly skilled Senior Full Stack Engineer with over 7 years of experience specializing in React, Node.js, Python, Supabase, and cloud architectures. Passionate about building performant, secure, and user-centric web applications.", body_style))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph("Work Experience", heading_style))
    Story.append(Paragraph("<b>Senior Software Engineer - Google</b><br/>Bangalore, India | 2022-03 to Present", body_style))
    Story.append(Paragraph("- Led the development of high-performance web applications using React and Node.js.<br/>- Optimized database queries, reducing response times by 35%.<br/>- Mentored junior engineers and implemented CI/CD pipelines.", body_style))
    Story.append(Spacer(1, 6))
    
    Story.append(Paragraph("<b>Full Stack Developer - Infosys</b><br/>Pune, India | 2019-06 to 2022-02", body_style))
    Story.append(Paragraph("- Developed features for enterprise client dashboards.<br/>- Built RESTful APIs using Express and integrated third-party payment gateways.<br/>- Reduced security vulnerabilities by 40% through code audits.", body_style))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph("Education", heading_style))
    Story.append(Paragraph("<b>B.Tech in Computer Science - IIT Delhi</b><br/>New Delhi, India | 2015-07 to 2019-05", body_style))
    Story.append(Paragraph("Graduated with Honors. Specialized in algorithms and database systems.", body_style))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph("Skills", heading_style))
    Story.append(Paragraph("React, Node.js, Python, Supabase, PostgreSQL, Docker, Git, REST APIs, AWS", body_style))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph("Projects", heading_style))
    Story.append(Paragraph("<b>AI Resume Builder - Lead Architect</b><br/>https://ai-resume-builder.dev", body_style))
    Story.append(Paragraph("Designed and built an intelligent resume generator utilizing Gemini to parse, scan, and optimize user resumes, generating real-time ATS critiques.", body_style))

    doc.build(Story)
    print("Test resume PDF created successfully!")

if __name__ == '__main__':
    create_pdf()
