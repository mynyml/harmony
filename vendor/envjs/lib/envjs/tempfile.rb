require 'tempfile'

require 'envjs'

class Envjs::TempFile < Tempfile

  def initialize pattern, suffix = nil
    super(pattern)


    if suffix
      new_path = path + "." + suffix
      File.link path, new_path
      File.unlink path
      # blah ... implementation specific ...
      @data[0] = @tmpname = new_path
    end
  end

  def getAbsolutePath
    path
  end

end
